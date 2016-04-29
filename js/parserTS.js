function Stream(PID, StreamID, Size)
{
	this.PID = PID;
	this.StreamID = StreamID;
	this.Index = 0;//текущий размер массива
	this.Data = new Uint8Array(Size);
}

function ExtractStreams(fileByte)
{
	//для отсчёта времени
	var DT0 = new Date();

	//здесь хранятся потоки
	streams = new Array();

	//пройдём по TS пакетам
	for (var i = 0; i < fileByte.length / 188; i++)
	{
		//данные одного пакета
		var flagBeginData = 0;
		var PID = 0;
		var pointerData = 0;//наличие полей адаптации
		var streamID;

		//наличие заголовка PES-пакета
		flagBeginData = fileByte[i * 188 + 1];

		flagBeginData = flagBeginData >>> 6;
		flagBeginData = flagBeginData & 0x1;

		//найдём PID
		var byte1 = fileByte[i * 188 + 1];
		var byte2 = fileByte[i * 188 + 2];
		byte1 = byte1 & 0x1F;//оставим 5 нужных бита, применив маску 11111
		byte1 = (byte1 << 8);//сдвинем на 8 битов, т.к это старший байт
		PID = byte1 + byte2;

		//наличие поля адаптации в TS пакете
		var byte4 = fileByte[i * 188 + 3];
		byte4 = byte4 >>> 4;
		byte4 = byte4 & 0x3;
		pointerData = byte4;

		//надём длину поля адаптации
		var lengthPointerData = 0;
		if(pointerData == 3)
		{
			lengthPointerData = fileByte[i * 188 + 4] + 1;//длина поля адаптации
		}

		//если есть данные в TS пакете
		if ((pointerData == 3 ||
			pointerData == 1) &&
			lengthPointerData <= 184)
		{
			//посмотрим, если ли у нас поток с таким PID'ом
			var PIDon = false;//есть ли PID в списке
			var indexPID = 0;
			for (var j = 0; j < streams.length; j++)
			{
				if (streams[j].PID == PID)
				{
					PIDon = true;
					indexPID = j;
					break;
				}
			}

			//если пакет TS с PES заголовком
			if (flagBeginData == 1)
			{
				//получим streamID
				streamID = fileByte[i * 188 + 4 + lengthPointerData + 3];

				//получим длину заголовка PES пакета
				var lengthHeadPes = fileByte[i * 188 + 4 + lengthPointerData + 8];
				//начало полезных данных в текущем пакете TS
				var indexDataBegin = i * 188 + 4 + lengthPointerData + 8 + 1 + lengthHeadPes;
				//конец полезных данных в пакете TS
				var indexDataEnd = i * 188 + 187;

				//начало, конец и длина стаффинговых байт
				var staffingBegin = 0;
				var staffingEnd = 0;
				var staffingLength = 0;
				//поиск стаффинговых байт по данным в TS пакете
				for (var j = indexDataBegin; j <= indexDataEnd; j++)
				{
					if(j <= indexDataEnd - 2)
					{
						//если нашли начало "пустых" байтов 00ff
						if (fileByte[j + 1] == 0 &&
							fileByte[j + 2] == 255)
						{
							staffingLength = fileByte[j];
							staffingBegin = j + 1;
							j = j + 2;
						}
					}
					//если найдено начало "пустых" байтов и не определён конец их
					if (staffingBegin != 0 &&
						staffingEnd == 0)
					{		
						//подошли к концу пакета
						if (j == indexDataEnd &&
							fileByte[j] == 255)
						{
							staffingEnd = j;
						}	
						//закончились "пустые" байты
						if(fileByte[j] != 255)
						{
							staffingEnd = j - 1;
						}
					}
				}

				//нет потока - создаём
				if(PIDon == false)
				{
					//создадим новый поток
					streams[streams.length] = new Stream(PID, streamID, fileByte.length);
					//проверка на "пустые" байты
					if (staffingBegin != 0 &&
						staffingEnd != 0 &&
						staffingLength + 1 == staffingEnd - staffingBegin)
					{
						//есть "пустые" байты
						//добавляем полезные данные из TS пакета в чистый поток
						var temp1 = new Array();
						var temp2 = new Array();

						temp1 = fileByte.subarray(indexDataBegin, staffingBegin);
						temp2 = fileByte.subarray(staffingEnd + 1, indexDataEnd + 1);

						streams[streams.length - 1].Data.set(temp1, streams[streams.length - 1].Index);
						streams[streams.length - 1].Index += temp1.length;

						streams[streams.length - 1].Data.set(temp2, streams[streams.length - 1].Index);
						streams[streams.length - 1].Index += temp2.length;
					}
					else
					{
						//нет пустых байт
						//добавляем полезные данные из TS пакета в чистый поток
						var temp1 = new Array();
						temp1 = fileByte.subarray(indexDataBegin, indexDataEnd + 1);

						streams[streams.length - 1].Data.set(temp1, streams[streams.length - 1].Index);
						streams[streams.length - 1].Index += temp1.length;
					}
				}
				else
				{
					//поток чистых данных уже есть, добавим данные
					//проверка на "пустые" байты
					if (staffingBegin != 0 &&
						staffingEnd != 0 &&
						staffingLength + 1 == staffingEnd - staffingBegin)
					{
						//есть "пустые" байты
						//добавляем полезные данные из TS пакета в чистый поток
						var temp1 = new Array();
						var temp2 = new Array();
									
						temp1 = fileByte.subarray(indexDataBegin, staffingBegin);
						temp2 = fileByte.subarray(staffingEnd + 1, indexDataEnd + 1);
						
						streams[indexPID].Data.set(temp1, streams[indexPID].Index);
						streams[indexPID].Index += temp1.length;
						
						streams[indexPID].Data.set(temp2, streams[indexPID].Index);
						streams[indexPID].Index += temp2.length;
					}
					else
					{
						//нет пустых байт
						//добавляем полезные данные из TS пакета в чистый поток
						var temp1 = new Array();
						
						temp1 = fileByte.subarray(indexDataBegin, indexDataEnd + 1);
						
						streams[indexPID].Data.set(temp1, streams[indexPID].Index);
						streams[indexPID].Index += temp1.length;
					}
				}
			}



			//если пакет TS без PES заголовка
			if (flagBeginData == 0)
			{
				//начало полезных данных в текущем пакете TS
				var indexDataBegin = i * 188 + 4 + lengthPointerData;
				//конец полезных данных в пакете TS
				var indexDataEnd = i * 188 + 187;

				//начало, конец и длина стаффинговых байт
				var staffingBegin = 0;
				var staffingEnd = 0;
				var staffingLength = 0;
				for (var j = indexDataBegin; j <= indexDataEnd; j++)
				{
					if(j <= indexDataEnd - 2)
					{
						//если нашли начало "пустых" байтов 00ff
						if (fileByte[j + 1] == 0 &&
							fileByte[j + 2] == 255)
						{
							staffingLength = fileByte[j];
							staffingBegin = j + 1;
							j = j + 2;
						}
					}

					//если найдено начало "пустых" байтов и не определён конец их
					if (staffingBegin != 0 &&
						staffingEnd == 0)
					{		
						//подошли к концу пакета
						if (j == indexDataEnd &&
							fileByte[j] == 255)
						{
							staffingEnd = j;
						}
							
						//закончились "пустые" байты
						if(fileByte[j] != 255)
						{
							staffingEnd = j - 1;
						}
					}
				}

				//поток должен существовать
				if(PIDon == true)
				{
					//проверка на "пустые" байты
					if (staffingBegin != 0 &&
						staffingEnd != 0 &&
						staffingLength + 1 == staffingEnd - staffingBegin)
					{
						//есть "пустые" байты
						//добавляем полезные данные из TS пакета в чистый поток
						var temp1 = new Array();
						var temp2 = new Array();

						temp1 = fileByte.subarray(indexDataBegin, staffingBegin);
						temp2 = fileByte.subarray(staffingEnd + 1, indexDataEnd + 1);

						streams[indexPID].Data.set(temp1, streams[indexPID].Index);
						streams[indexPID].Index += temp1.length;

						streams[indexPID].Data.set(temp2, streams[indexPID].Index);
						streams[indexPID].Index += temp2.length;
					}
					else
					{
						//нет "пустых" байт
						//добавляем полезные данные из TS пакета в чистый поток
						var temp1 = new Array();

						temp1 = fileByte.subarray(indexDataBegin, indexDataEnd + 1);

						streams[indexPID].Data.set(temp1, streams[indexPID].Index);
						streams[indexPID].Index += temp1.length;
					}
				}
			}
		}	
	}

	var DT1 = new Date();
	alert("Время выделения чистых потоков из TS-файла: " + (DT1 - DT0) + " мс");
	

	//отладочный код создания файла чистого потока и скачивания этого файла браузером (работает безотказно в опере)
	/*var ddd = new Uint8Array(streams[4].Index);
	for (var i = 0; i < ddd.length; i++)
	{
		ddd[i] = streams[4].Data[i];
	}	
	
	var saveData = (function () {
            var a = document.createElement("a");
            document.body.appendChild(a);
            a.style = "display: none";
            return function (data, fileName) {

                var blob = new Blob([data], {type: "application/octet-stream"}),
                url = window.URL.createObjectURL(blob);
            a.href = url;
            a.download = fileName;
            a.click();
            window.URL.revokeObjectURL(url);
            };
        }());
        saveData(ddd, "xxxxxx.aac");*/
}