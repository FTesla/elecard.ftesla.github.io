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
	
	//PTS и DTS для аудио
	var PTSsA = new Array();
    var DTSsA = new Array();

	//PTS и DTS для видео
    var PTSsV = new Array();
    var DTSsV = new Array();

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
				
				//получим из pes пакета - PTS и DTS
				if(lengthHeadPes != 0)
				{
					var PTS_DTS_flags = (fileByte[i * 188 + 4 + lengthPointerData + 8 + 1] & 0xF0) >> 4;
					if(PTS_DTS_flags == 2)
					{
						var PTS = 0;
						var byteHeadPes = fileByte[i * 188 + 4 + lengthPointerData + 8 + 1];
                        PTS += (byteHeadPes & 0xE) << 29;
						var byteHeadPes = fileByte[i * 188 + 4 + lengthPointerData + 8 + 2];
                        PTS += byteHeadPes << 22;
						var byteHeadPes = fileByte[i * 188 + 4 + lengthPointerData + 8 + 3];
                        PTS += (byteHeadPes & 0xFE) << 14;
						var byteHeadPes = fileByte[i * 188 + 4 + lengthPointerData + 8 + 4];
                        PTS += byteHeadPes << 7;
						var byteHeadPes = fileByte[i * 188 + 4 + lengthPointerData + 8 + 5];
                        PTS += (byteHeadPes & 0xFE) >> 1;
						
						if (streamID >= 192 &&
							streamID <= 223)
						{
							PTSsA[PTSsA.length] = PTS;
							DTSsA[DTSsA.length] = 0;
							
						}
						if (streamID >= 224 &&
							streamID <= 239)
						{
							PTSsV[PTSsV.length] = PTS;
							DTSsV[DTSsV.length] = 0;
						}
					}
					
					if(PTS_DTS_flags == 3)
					{
						var PTS = 0;
						var byteHeadPes = fileByte[i * 188 + 4 + lengthPointerData + 8 + 1];
                        PTS += (byteHeadPes & 0xE) << 29;
						byteHeadPes = fileByte[i * 188 + 4 + lengthPointerData + 8 + 2];
                        PTS += byteHeadPes << 22;
						byteHeadPes = fileByte[i * 188 + 4 + lengthPointerData + 8 + 3];
                        PTS += (byteHeadPes & 0xFE) << 14;
						byteHeadPes = fileByte[i * 188 + 4 + lengthPointerData + 8 + 4];
                        PTS += byteHeadPes << 7;
						byteHeadPes = fileByte[i * 188 + 4 + lengthPointerData + 8 + 5];
                        PTS += (byteHeadPes & 0xFE) >> 1;
						
						var DTS = 0;
						byteHeadPes = fileByte[i * 188 + 4 + lengthPointerData + 8 + 6];
						DTS += (byteHeadPes & 0xE) >> 29;
						byteHeadPes = fileByte[i * 188 + 4 + lengthPointerData + 8 + 7];
                        DTS += byteHeadPes << 22;
						byteHeadPes = fileByte[i * 188 + 4 + lengthPointerData + 8 + 8];
                        DTS += (byteHeadPes & 0xFE) << 14;
						byteHeadPes = fileByte[i * 188 + 4 + lengthPointerData + 8 + 9];
                        DTS += byteHeadPes << 7;
						byteHeadPes = fileByte[i * 188 + 4 + lengthPointerData + 8 + 10];
                        DTS += (byteHeadPes & 0xFE) >> 1;
						
						if (streamID >= 192 &&
							streamID <= 223)
						{
							PTSsA[PTSsA.length] = PTS;
							DTSsA[DTSsA.length] = DTS;
							
						}
						if (streamID >= 224 &&
							streamID <= 239)
						{
							PTSsV[PTSsV.length] = PTS;
							DTSsV[DTSsV.length] = DTS;
						}
					}
				}

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
							staffingBegin = j;
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
						staffingLength == staffingEnd - staffingBegin &&
						staffingLength > 2)
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
						staffingLength == staffingEnd - staffingBegin &&
						staffingLength > 2)
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
							staffingBegin = j;
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
						staffingLength == staffingEnd - staffingBegin &&
						staffingLength > 2)
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


	//создадим mp4
	var mp4 = new Uint8Array(fileByte.length);
	var mp4CurrentSize = 0;
	
	//атомы
	var ftyp = new Array();
	var free = new Array();
	var mdat = new Array();

	var moov = new Array();
	var mvhd = new Array();

	var trakA = new Array();
	var tkhdA = new Array();
	var edtsA = new Array();
	var elstA = new Array();
	var mdiaA = new Array();
	var hdlrA = new Array();
	var mdhdA = new Array();
	var minfA = new Array();
	var smhdA = new Array();
	var dinfA = new Array();
	var stblA;
	var stsdA = new Array();
	var sttsA = new Array();
	var stscA = new Array();
	var stszA = new Array();
	var stcoA = new Array();

	var trakV = new Array();
	var tkhdV = new Array();
	var edtsV = new Array();
	var elstV = new Array();
	var mdiaV = new Array();
	var hdlrV = new Array();
	var mdhdV = new Array();
	var minfV = new Array();
	var vmhdV = new Array();
	var dinfV = new Array();
	var stblV = new Array();
	var stsdV = new Array();
	var cttsV = new Array();
	var sttsV = new Array();
	var stscV = new Array();
	var stszV = new Array();
	var stcoV = new Array();
	
	var PTSsVSort = new Array();
	var audioDurationTS = 0;//длительность видео в единицах TS
	var audioDurationMilliseconds = 0;//длительность видео в миллисекундах
	var audioDelta = 1024;
	var audioDurationMDHD = 0;//количество семплов * делта
	var audioTimeScaleMDHD = 0;//videoDurationMDHD / длительность видео в секундах
	var audioRatioDelta = 0; //delta / длительность семпла TS
	
	var PTSsASort = new Array();
	var videoDurationTS = 0;//длительность видео в единицах TS
	var videoDurationMilliseconds = 0;//длительность видео в миллисекундах
	var videoDelta = 512;
	var videoDurationMDHD = 0;//количество семплов * делта
	var videoTimeScaleMDHD = 0;//videoDurationMDHD / длительность видео в секундах
	var videoRatioDelta = 0; //delta / длительность семпла TS
	
	ftyp[0] = 0;
	ftyp[1] = 0;
	ftyp[2] = 0;
	ftyp[3] = 32;
	ftyp[4] = 102;
	ftyp[5] = 116;
	ftyp[6] = 121;
	ftyp[7] = 112;
	ftyp[8] = 105;
	ftyp[9] = 115;
	ftyp[10] = 111;
	ftyp[11] = 109;
	ftyp[12] = 0;
	ftyp[13] = 0;
	ftyp[14] = 2;
	ftyp[15] = 0;
	ftyp[16] = 105;
	ftyp[17] = 115;
	ftyp[18] = 111;
	ftyp[19] = 109;
	ftyp[20] = 105;
	ftyp[21] = 115;
	ftyp[22] = 111;
	ftyp[23] = 50;
	ftyp[24] = 97;
	ftyp[25] = 118;
	ftyp[26] = 99;
	ftyp[27] = 49;
	ftyp[28] = 109;
	ftyp[29] = 112;
	ftyp[30] = 52;
	ftyp[31] = 49;
	mp4.set(ftyp, mp4CurrentSize);
	mp4CurrentSize += ftyp.length;
	
	free[0] = 0;
	free[1] = 0;
	free[2] = 0;
	free[3] = 8;
	free[4] = 102;
	free[5] = 114;
	free[6] = 101;
	free[7] = 101;
	mp4.set(free, mp4CurrentSize);
	mp4CurrentSize += free.length;
		
	mdat[0] = 0;
    mdat[1] = 0;
    mdat[2] = 0;
    mdat[3] = 0;
    mdat[4] = 109;//m
    mdat[5] = 100;//d
    mdat[6] = 97; //a
    mdat[7] = 116;//t
	mp4.set(mdat, mp4CurrentSize);
	mp4CurrentSize += mdat.length;
		
	//найдём индекс для видео и для аудио
	var indexAudio = 0;
	var indexVideo = 0;
	for (var i = 0; i < streams.length; i++)
	{
		//аудио
		if(streams[i].StreamID == 192)
		{
			indexAudio = i;
		}
		//видео
		if(streams[i].StreamID == 224)
		{
			indexVideo = i;
		}
	}
	
	//подготовим аудио (уберём заголовки и запишем размеры sample'ов)
	var sizeSamplesA = new Array();
	var audioLength = 0;
	var j = 0;
	var sampleCountA;
	var PTSDTSIndex = 0;//позиция в PTS и DTS 
	while (j + 7 < streams[indexAudio].Index)
	{
		//если первые 12 бит = 1, это начало пакета ADTS
		if (streams[indexAudio].Data[j] == 255 &&
			(streams[indexAudio].Data[j + 1] & 0xF0) >> 4 == 15)
		{
			
			var len1 = (streams[indexAudio].Data[j + 3] & 0x3) << 11;  //  | | | | | | |x|x|       | | | | | | | | |       | | | | | | | | |
			var len2 = streams[indexAudio].Data[j + 4] << 3;           //  | | | | | | | | |       |x|x|x|x|x|x|x|x|       | | | | | | | | |
			var len3 = (streams[indexAudio].Data[j + 5] & 0xE0) >> 5;  //  | | | | | | | | |       | | | | | | | | |       |x|x|x| | | | | |

			//длина sample с заголовком
			var lengthSample = len1 + len2 + len3;
			
			if(PTSsA[PTSDTSIndex] > DTSsA[PTSDTSIndex])
			{
				PTSsASort[PTSsASort.length] = PTSsA[PTSDTSIndex];
				
			}
			
			//запишем длину в массив
				sizeSamplesA[sizeSamplesA.length] = lengthSample - 7;
				audioLength += lengthSample - 7;
				
				//добавим sample в массив
				var audioMP4 = new Array();

				//добавим в контейнер аудио
				audioMP4 = streams[indexAudio].Data.subarray(j + 7, j + lengthSample);

				mp4.set(audioMP4, mp4CurrentSize);
				mp4CurrentSize += audioMP4.length;
			
			
			j = j + lengthSample;
			PTSDTSIndex++;
		}
		else
		{
			j++;
		}
	}
	sampleCountA = sizeSamplesA.length;
			

	//подготовим видео (запишем размеры sample'ов)
	var sizeSamplesV = new Array();
	var videoLength = 0;
	j = 0;
	var sampleCountV = 0;
	var sampleIndexOld = 0;//предыдущий индекс семпла
	PTSDTSIndex = 0;//позиция в PTS и DTS
	while (j + 5 < streams[indexVideo].Index)
	{
		if (streams[indexVideo].Data[j] == 0 &&
			streams[indexVideo].Data[j + 1] == 0 &&
			streams[indexVideo].Data[j + 2] == 0 &&
			streams[indexVideo].Data[j + 3] == 1 &&
			streams[indexVideo].Data[j + 4] == 9 &&
			streams[indexVideo].Data[j + 5] == 240)
		{
			//длина sample
			var lengthSample = j - sampleIndexOld;
	
			if (lengthSample != 0)
			{
				if(PTSsV[PTSDTSIndex] > DTSsV[PTSDTSIndex])
				{
					PTSsVSort[PTSsVSort.length] = PTSsV[PTSDTSIndex];
					//подправим заголовки h264 семплов
					streams[indexVideo].Data[sampleIndexOld + 3] = 2;
					streams[indexVideo].Data[sampleIndexOld + 6] = ((lengthSample - 10) & 0xFF000000) >> 24;//размер
					streams[indexVideo].Data[sampleIndexOld + 7] = ((lengthSample - 10) & 0xFF0000) >> 16;  //размер
					streams[indexVideo].Data[sampleIndexOld + 8] = ((lengthSample - 10) & 0xFF00) >> 8;     //размер
					streams[indexVideo].Data[sampleIndexOld + 9] = (lengthSample - 10) & 0xFF;              //размер
			
					//запишем длину в массив
					sizeSamplesV[sizeSamplesV.length] = lengthSample;
					videoLength += lengthSample;
					
					//добавим в контейнер видео
					var videoMP4 = new Array();
					videoMP4 = streams[indexVideo].Data.subarray(sampleIndexOld, j);
					mp4.set(videoMP4, mp4CurrentSize);
					mp4CurrentSize += videoMP4.length;
				}
				PTSDTSIndex++;
			}
			sampleIndexOld = j;
			
		}
		j++;
	}
	//докопируем послений элемент
	//длина sample
	var lengthSample = j - sampleIndexOld;
	if(PTSsV[PTSDTSIndex] > DTSsV[PTSDTSIndex])
	{
		PTSsVSort[PTSsVSort.length] = PTSsV[PTSDTSIndex];
		if (lengthSample != 0)
		{
			//подправим заголовки h264 семплов
			streams[indexVideo].Data[sampleIndexOld + 3] = 2;
			streams[indexVideo].Data[sampleIndexOld + 6] = ((lengthSample - 10) & 0xFF000000) >> 24;//размер
			streams[indexVideo].Data[sampleIndexOld + 7] = ((lengthSample - 10) & 0xFF0000) >> 16;  //размер
			streams[indexVideo].Data[sampleIndexOld + 8] = ((lengthSample - 10) & 0xFF00) >> 8;     //размер
			streams[indexVideo].Data[sampleIndexOld + 9] = (lengthSample - 10) & 0xFF;              //размер
					
			//запишем длину в массив
			sizeSamplesV[sizeSamplesV.length] = lengthSample;
			videoLength += lengthSample;
			
			//добавим в контейнер видео
			var videoMP4 = new Array();
			videoMP4 = streams[indexVideo].Data.subarray(sampleIndexOld, j);
			mp4.set(videoMP4, mp4CurrentSize);
			mp4CurrentSize += videoMP4.length;
		}	
	}
	sampleCountV = sizeSamplesV.length;		
			
			
	//скорректируем размер mdat
	mp4[40] = ((audioLength + videoLength + 8) & 0xFF000000) >> 24;
	mp4[41] = ((audioLength + videoLength + 8) & 0xFF0000) >> 16;
	mp4[42] = ((audioLength + videoLength + 8) & 0xFF00) >> 8;
	mp4[43] = (audioLength + videoLength + 8) & 0xFF;
	
	
	///вычислим параметры аудио и видео
	//отсортируем PTS
	PTSsASort.sort(compareNumeric);
	
	//найдём максмальное значение длительности TS 
	var sampleDurationAudioMax = PTSsASort[1] - PTSsASort[0];
	for(var j = 2; j < PTSsASort.length; j++)
	{
		if(sampleDurationAudioMax > PTSsASort[j] - PTSsASort[j - 1]) sampleDurationAudioMax = PTSsASort[j] - PTSsASort[j - 1];
	}
	
	audioDurationTS = PTSsASort[PTSsASort.length - 1] - PTSsASort[0];//длительность видео в единицах TS
	audioDurationMilliseconds = audioDurationTS * 1000 / 90000;//длительность видео в миллисекундах
	audioDelta = 1024;
	audioDurationMDHD = sampleCountA * audioDelta;//количество семплов * делта
	audioTimeScaleMDHD = Math.round(audioDurationMDHD * 1000 / audioDurationMilliseconds);//videoDurationMDHD / длительность видео в секундах
	audioRatioDelta = audioDelta / sampleDurationAudioMax; //delta / длительность семпла TS
	
	
	//отсортируем PTS
	PTSsVSort.sort(compareNumeric);
	
	//найдём максмальное значение длительности TS 
	var sampleDurationVideoMax = PTSsVSort[1] - PTSsVSort[0];
	for(var j = 2; j < PTSsVSort.length; j++)
	{
		if(sampleDurationVideoMax > PTSsVSort[j] - PTSsVSort[j - 1]) sampleDurationVideoMax = PTSsVSort[j] - PTSsVSort[j - 1];
	}
	
	videoDurationTS = PTSsVSort[PTSsVSort.length - 1] - PTSsVSort[0];//длительность видео в единицах TS
	videoDurationMilliseconds = videoDurationTS * 1000 / 90000;//длительность видео в миллисекундах
	videoDelta = 512;
	videoDurationMDHD = sampleCountV * videoDelta;//количество семплов * делта
	videoTimeScaleMDHD = Math.round(videoDurationMDHD * 1000 / videoDurationMilliseconds);//videoDurationMDHD / длительность видео в секундах
	videoRatioDelta = videoDelta / sampleDurationVideoMax; //delta / длительность семпла TS
	
	
	//соберём аудио
	stsdA[0] = 0;
	stsdA[1] = 0;
	stsdA[2] = 0;
	stsdA[3] = 103;
	stsdA[4] = 115;
	stsdA[5] = 116;
	stsdA[6] = 115;
	stsdA[7] = 100;
	stsdA[8] = 0;
	stsdA[9] = 0;
	stsdA[10] = 0;
	stsdA[11] = 0;
	stsdA[12] = 0;
	stsdA[13] = 0;
	stsdA[14] = 0;
	stsdA[15] = 1;
	stsdA[16] = 0;
	stsdA[17] = 0;
	stsdA[18] = 0;
	stsdA[19] = 87;
	stsdA[20] = 109;
	stsdA[21] = 112;
	stsdA[22] = 52;
	stsdA[23] = 97;
	stsdA[24] = 0;
	stsdA[25] = 0;
	stsdA[26] = 0;
	stsdA[27] = 0;
	stsdA[28] = 0;
	stsdA[29] = 0;
	stsdA[30] = 0;
	stsdA[31] = 1;
	stsdA[32] = 0;
	stsdA[33] = 0;
	stsdA[34] = 0;
	stsdA[35] = 0;
	stsdA[36] = 0;
	stsdA[37] = 0;
	stsdA[38] = 0;
	stsdA[39] = 0;
	stsdA[40] = 0;
	stsdA[41] = 2;
	stsdA[42] = 0;
	stsdA[43] = 16;
	stsdA[44] = 0;
	stsdA[45] = 0;
	stsdA[46] = 0;
	stsdA[47] = 0;
	stsdA[48] = 187;
	stsdA[49] = 128;
	stsdA[50] = 0;
	stsdA[51] = 0;
	stsdA[52] = 0;
	stsdA[53] = 0;
	stsdA[54] = 0;
	stsdA[55] = 51;
	stsdA[56] = 101;
	stsdA[57] = 115;
	stsdA[58] = 100;
	stsdA[59] = 115;
	stsdA[60] = 0;
	stsdA[61] = 0;
	stsdA[62] = 0;
	stsdA[63] = 0;
	stsdA[64] = 3;
	stsdA[65] = 128;
	stsdA[66] = 128;
	stsdA[67] = 128;
	stsdA[68] = 34;
	stsdA[69] = 0;
	stsdA[70] = 1;
	stsdA[71] = 0;
	stsdA[72] = 4;
	stsdA[73] = 128;
	stsdA[74] = 128;
	stsdA[75] = 128;
	stsdA[76] = 20;
	stsdA[77] = 64;
	stsdA[78] = 21;
	stsdA[79] = 0;
	stsdA[80] = 0;
	stsdA[81] = 0;
	stsdA[82] = 0;
	stsdA[83] = 0;
	stsdA[84] = 249;
	stsdA[85] = 6;
	stsdA[86] = 0;
	stsdA[87] = 0;
	stsdA[88] = 242;
	stsdA[89] = 82;
	stsdA[90] = 5;
	stsdA[91] = 128;
	stsdA[92] = 128;
	stsdA[93] = 128;
	stsdA[94] = 2;
	stsdA[95] = 17;
	stsdA[96] = 144;
	stsdA[97] = 6;
	stsdA[98] = 128;
	stsdA[99] = 128;
	stsdA[100] = 128;
	stsdA[101] = 1;
	stsdA[102] = 2;
	
	sttsA[0] = 0;//размер атома
	sttsA[1] = 0;//размер атома
	sttsA[2] = 0;//размер атома
	sttsA[3] = 24;//размер атома
	sttsA[4] = 115;//s
	sttsA[5] = 116;//t
	sttsA[6] = 116;//t
	sttsA[7] = 115;//s
	sttsA[8] = 0;//флаг
	sttsA[9] = 0;//флаг
	sttsA[10] = 0;//флаг
	sttsA[11] = 0;//флаг
	sttsA[12] = 0;//количество записей
	sttsA[13] = 0;//количество записей
	sttsA[14] = 0;//количество записей
	sttsA[15] = 1;//количество записей
	sttsA[16] = (sampleCountA & 0xFF000000) >> 24;//количество sample'ов
	sttsA[17] = (sampleCountA & 0xFF0000) >> 16;  //количество sample'ов
	sttsA[18] = (sampleCountA & 0xFF00) >> 8;     //количество sample'ов
	sttsA[19] = sampleCountA & 0xFF;              //количество sample'ов
	sttsA[20] = 0;//продолжительность sample
	sttsA[21] = 0;//продолжительность sample
	sttsA[22] = 4;//продолжительность sample
	sttsA[23] = 0;//продолжительность sample
	
	stscA[0] = 0;//размер атома
	stscA[1] = 0;//размер атома
	stscA[2] = 0;//размер атома
	stscA[3] = 28;//размер атома
	stscA[4] = 115;//s
	stscA[5] = 116;//t
	stscA[6] = 115;//s
	stscA[7] = 99;//c
	stscA[8] = 0;//флаг
	stscA[9] = 0;//флаг
	stscA[10] = 0;//флаг
	stscA[11] = 0;//флаг
	stscA[12] = 0;//количество записей
	stscA[13] = 0;//количество записей
	stscA[14] = 0;//количество записей
	stscA[15] = 1;//количество записей
	stscA[16] = 0;//первый кусок
	stscA[17] = 0;//первый кусок
	stscA[18] = 0;//первый кусок
	stscA[19] = 1;//первый кусок
	stscA[20] = (sampleCountA & 0xFF000000) >> 24;//количество sample'ов в куске
	stscA[21] = (sampleCountA & 0xFF0000) >> 16;  //количество sample'ов в куске
	stscA[22] = (sampleCountA & 0xFF00) >> 8;     //количество sample'ов в куске
	stscA[23] = sampleCountA & 0xFF;              //количество sample'ов в куске
	stscA[24] = 0;//ID sample
	stscA[25] = 0;//ID sample
	stscA[26] = 0;//ID sample
	stscA[27] = 1;//ID sample
	
	var stszSizeA = 20 + sampleCountA * 4;
	stszA [0] = (stszSizeA & 0xFF000000) >> 24;//размер атома
	stszA [1] = (stszSizeA & 0xFF0000) >> 16;  //размер атома
	stszA [2] = (stszSizeA & 0xFF00) >> 8;     //размер атома
	stszA [3] = stszSizeA & 0xFF;              //размер атома
	stszA [4] = 115;//s
	stszA [5] = 116;//t
	stszA [6] = 115;//s
	stszA [7] = 122;//z
	stszA [8] = 0;//версия
	stszA [9] = 0;//версия
	stszA [10] = 0;//версия
	stszA [11] = 0;//версия
	stszA [12] = 0;//флаг
	stszA [13] = 0;//флаг
	stszA [14] = 0;//флаг
	stszA [15] = 0;//флаг
	stszA [16] = (sampleCountA & 0xFF000000) >> 24;//количество sample'ов
	stszA [17] = (sampleCountA & 0xFF0000) >> 16;  //количество sample'ов
	stszA [18] = (sampleCountA & 0xFF00) >> 8;     //количество sample'ов
	stszA [19] = sampleCountA & 0xFF;              //количество sample'ов
	for (i = 0; i < sizeSamplesA.length; i++)
	{
		stszA [20 + i * 4] = (sizeSamplesA[i] & 0xFF000000) >> 24;    //размер sample'а
		stszA [20 + i * 4 + 1] = (sizeSamplesA[i] & 0xFF0000) >> 16;  //размер sample'а
		stszA [20 + i * 4 + 2] = (sizeSamplesA[i] & 0xFF00) >> 8;     //размер sample'а
		stszA [20 + i * 4 + 3] = sizeSamplesA[i] & 0xFF;              //размер sample'а
	}
	
	stcoA[0] = 0;//размер атома
	stcoA[1] = 0;  //размер атома
	stcoA[2] = 0;     //размер атома
	stcoA[3] = 20;              //размер атома
	stcoA[4] = 115;//s
	stcoA[5] = 116;//t
	stcoA[6] = 99;//c
	stcoA[7] = 111;//o
	stcoA[8] = 0;//флаг
	stcoA[9] = 0;//флаг
	stcoA[10] = 0;//флаг
	stcoA[11] = 0;//флаг
	stcoA[12] = 0;//число кусков
	stcoA[13] = 0;//число кусков
	stcoA[14] = 0;//число кусков
	stcoA[15] = 1;//число кусков
	stcoA[16] = ((ftyp.length + free.length + 8) & 0xFF000000) >> 24;//указатель на начало данных
	stcoA[17] = ((ftyp.length + free.length + 8) & 0xFF0000) >> 16;  //указатель на начало данных
	stcoA[18] = ((ftyp.length + free.length + 8) & 0xFF00) >> 8;     //указатель на начало данных
	stcoA[19] = (ftyp.length + free.length + 8) & 0xFF;              //указатель на начало данных
	
	
	var stblLengthA = 8 + stsdA.length + sttsA.length + stscA.length + stszA.length + stcoA.length;
	stblA = new Uint8Array(stblLengthA);
	stblA[0] = (stblLengthA & 0xFF000000) >> 24;//размер атома
	stblA[1] = (stblLengthA & 0xFF0000) >> 16;  //размер атома
	stblA[2] = (stblLengthA & 0xFF00) >> 8;     //размер атома
	stblA[3] = stblLengthA & 0xFF;              //размер атома
	stblA[4] = 115;//s
	stblA[5] = 116;//t
	stblA[6] = 98;//b
	stblA[7] = 108;//l
	stblA.set(stsdA, 8);
	stblA.set(sttsA, 8 + stsdA.length);
	stblA.set(stscA, 8 + stsdA.length + sttsA.length);
	stblA.set(stszA, 8 + stsdA.length + sttsA.length + stscA.length);
	stblA.set(stcoA, 8 + stsdA.length + sttsA.length + stscA.length + stszA.length);
	
	dinfA[0] = 0;
	dinfA[1] = 0;
	dinfA[2] = 0;
	dinfA[3] = 36;
	dinfA[4] = 100;
	dinfA[5] = 105;
	dinfA[6] = 110;
	dinfA[7] = 102;
	dinfA[9] = 0;
	dinfA[9] = 0;
	dinfA[10] = 0;
	dinfA[11] = 28;
	dinfA[12] = 100;
	dinfA[13] = 114;
	dinfA[14] = 101;
	dinfA[15] = 102;
	dinfA[16] = 0;
	dinfA[17] = 0;
	dinfA[18] = 0;
	dinfA[19] = 0;
	dinfA[20] = 0;
	dinfA[21] = 0;
	dinfA[22] = 0;
	dinfA[23] = 1;
	dinfA[24] = 0;
	dinfA[25] = 0;
	dinfA[26] = 0;
	dinfA[27] = 12;
	dinfA[28] = 117;
	dinfA[29] = 114;
	dinfA[30] = 108;
	dinfA[31] = 32;
	dinfA[32] = 0;
	dinfA[33] = 0;
	dinfA[34] = 0;
	dinfA[35] = 1;
	
	
	smhdA[0] = 0;
	smhdA[1] = 0;
	smhdA[2] = 0;
	smhdA[3] = 16;
	smhdA[4] = 115;
	smhdA[5] = 109;
	smhdA[6] = 104;
	smhdA[7] = 100;
	smhdA[9] = 0;
	smhdA[9] = 0;
	smhdA[10] = 0;
	smhdA[11] = 0;
	smhdA[12] = 0;
	smhdA[13] = 0;
	smhdA[14] = 0;
	smhdA[15] = 0;
	
	 //соберём minf
	var minfLengthA = 8 + smhdA.length + dinfA.length + stblA.length;
	minfA = new Uint8Array(minfLengthA);
	minfA[0] = (minfLengthA & 0xFF000000) >> 24;//размер атома
	minfA[1] = (minfLengthA & 0xFF0000) >> 16;//размер атома
	minfA[2] = (minfLengthA & 0xFF00) >> 8;//размер атома
	minfA[3] = minfLengthA & 0xFF;//размер атома
	minfA[4] = 109;//m
	minfA[5] = 105;//i
	minfA[6] = 110;//n
	minfA[7] = 102;//f
	minfA.set(smhdA, 8);
	minfA.set(dinfA, 8 + smhdA.length);
	minfA.set(stblA, 8 + smhdA.length + dinfA.length);
	
	
	hdlrA[0] = 0;
	hdlrA[1] = 0;
	hdlrA[2] = 0;
	hdlrA[3] = 45;
	hdlrA[4] = 104;
	hdlrA[5] = 100;
	hdlrA[6] = 108;
	hdlrA[7] = 114;
	hdlrA[9] = 0;
	hdlrA[9] = 0;
	hdlrA[10] = 0;
	hdlrA[11] = 0;
	hdlrA[12] = 0;
	hdlrA[13] = 0;
	hdlrA[14] = 0;
	hdlrA[15] = 0;
	hdlrA[16] = 115;
	hdlrA[17] = 111;
	hdlrA[18] = 117;
	hdlrA[19] = 110;
	hdlrA[20] = 0;
	hdlrA[21] = 0;
	hdlrA[22] = 0;
	hdlrA[23] = 0;
	hdlrA[24] = 0;
	hdlrA[25] = 0;
	hdlrA[26] = 0;
	hdlrA[27] = 0;
	hdlrA[28] = 0;
	hdlrA[29] = 0;
	hdlrA[30] = 0;
	hdlrA[31] = 0;
	hdlrA[32] = 83;
	hdlrA[33] = 111;
	hdlrA[34] = 117;
	hdlrA[35] = 110;
	hdlrA[36] = 100;
	hdlrA[37] = 72;
	hdlrA[38] = 97;
	hdlrA[39] = 110;
	hdlrA[40] = 100;
	hdlrA[41] = 108;
	hdlrA[42] = 101;
	hdlrA[43] = 114;
	hdlrA[44] = 0;
	
	mdhdA[0] = 0;//размер атома
	mdhdA[1] = 0;//размер атома
	mdhdA[2] = 0;//размер атома
	mdhdA[3] = 32;//размер атома
	mdhdA[4] = 109;//m
	mdhdA[5] = 100;//d
	mdhdA[6] = 104;//h
	mdhdA[7] = 100;//d
	mdhdA[8] = 0;//версия
	mdhdA[9] = 0;//флаг
	mdhdA[10] = 0;//флаг
	mdhdA[11] = 0;//флаг
	mdhdA[12] = 0;//время создания
	mdhdA[13] = 0;//время создания
	mdhdA[14] = 0;//время создания
	mdhdA[15] = 0;//время создания
	mdhdA[16] = 0;//время изменения
	mdhdA[17] = 0;//время изменения
	mdhdA[18] = 0;//время изменения
	mdhdA[19] = 0;//время изменения
	mdhdA[20] = ((audioTimeScaleMDHD) & 0xFF000000) >> 24;//time scale
	mdhdA[21] = ((audioTimeScaleMDHD) & 0xFF0000) >> 16;//time scale
	mdhdA[22] = ((audioTimeScaleMDHD) & 0xFF00) >> 8;//time scale
	mdhdA[23] = (audioTimeScaleMDHD) & 0xFF;//time scale
	mdhdA[24] = ((audioDurationMDHD) & 0xFF000000) >> 24;
	mdhdA[25] = ((audioDurationMDHD) & 0xFF0000) >> 16;
	mdhdA[26] = ((audioDurationMDHD) & 0xFF00) >> 8;
	mdhdA[27] = (audioDurationMDHD) & 0xFF;
	mdhdA[28] = 85;//язык
	mdhdA[29] = 196;//язык
	mdhdA[30] = 0;//Quality
	mdhdA[31] = 0;//Quality
	
	//соберём mdia
	var mdiaLengthA = 8 + mdhdA.length + hdlrA.length + minfA.length;
	mdiaA = new Uint8Array(mdiaLengthA);
	mdiaA[0] = (mdiaLengthA & 0xFF000000) >> 24;//размер атома
	mdiaA[1] = (mdiaLengthA & 0xFF0000) >> 16;//размер атома
	mdiaA[2] = (mdiaLengthA & 0xFF00) >> 8;//размер атома
	mdiaA[3] = mdiaLengthA & 0xFF;//размер атома
	mdiaA[4] = 109;//m
	mdiaA[5] = 100;//d
	mdiaA[6] = 105;//i
	mdiaA[7] = 97;//a
	mdiaA.set(mdhdA, 8);
	mdiaA.set(hdlrA, 8 + mdhdA.length);
	mdiaA.set(minfA, 8 + mdhdA.length + hdlrA.length);
	
	var audioDuration = sampleCountA * 1024 * 1000 / 48000;
	elstA[0] = 0;//размер атома
    elstA[1] = 0;//размер атома
    elstA[2] = 0;//размер атома
    elstA[3] = 28;//размер атома
    elstA[4] = 101;//e
    elstA[5] = 108;//l
    elstA[6] = 115;//s
    elstA[7] = 116;//t
    elstA[8] = 0;//версия
    elstA[9] = 0;//флаг
	elstA[10] = 0;//флаг
	elstA[11] = 0;//флаг
	elstA[12] = 0;//количество
	elstA[13] = 0;//количество
	elstA[14] = 0;//количество
	elstA[15] = 1;//количество
	elstA[16] = (audioDurationMilliseconds & 0xFF000000) >> 24;//длительность аудио
	elstA[17] = (audioDurationMilliseconds & 0xFF0000) >> 16;//длительность аудио
	elstA[18] = (audioDurationMilliseconds & 0xFF00) >> 8;//длительность аудио
	elstA[19] = audioDurationMilliseconds & 0xFF;//длительность аудио
	elstA[20] = 0;//начальное время
	elstA[21] = 0;//начальное время
	elstA[22] = 0;//начальное время
	elstA[23] = 0;//начальное время
	elstA[24] = 0;//скорость аудио 01.00
	elstA[25] = 1;//скорость аудио 01.00
	elstA[26] = 0;//скорость аудио 01.00
	elstA[27] = 0;//скорость аудио 01.00
	
	//соберём edts
	var edtsLengthA = 8 + elstA.length;
	edtsA = new Uint8Array(edtsLengthA);
	edtsA[0] = (edtsLengthA & 0xFF000000) >> 24;//размер атома
	edtsA[1] = (edtsLengthA & 0xFF0000) >> 16;//размер атома
	edtsA[2] = (edtsLengthA & 0xFF00) >> 8;//размер атома
	edtsA[3] = edtsLengthA & 0xFF;//размер атома
	edtsA[4] = 101;//e
	edtsA[5] = 100;//d
	edtsA[6] = 116;//t
	edtsA[7] = 115;//s
	edtsA.set(elstA, 8);
	
	tkhdA[0] = 0;//размер атома
	tkhdA[1] = 0;//размер атома
	tkhdA[2] = 0;//размер атома
	tkhdA[3] = 92;//размер атома
	tkhdA[4] = 116;//t
	tkhdA[5] = 107;//k
	tkhdA[6] = 104;//h
	tkhdA[7] = 100;//d
	tkhdA[8] = 0;//версия
	tkhdA[9] = 0;//флаги
	tkhdA[10] = 0;//флаги
	tkhdA[11] = 15;//флаги
	tkhdA[12] = 0;//время создания
	tkhdA[13] = 0;//время создания
	tkhdA[14] = 0;//время создания
	tkhdA[15] = 0;//время создания
	tkhdA[16] = 0;//время изменения
	tkhdA[17] = 0;//время изменения
	tkhdA[18] = 0;//время изменения
	tkhdA[19] = 0;//время изменения
	tkhdA[20] = 0;//track ID
	tkhdA[21] = 0;//track ID
	tkhdA[22] = 0;//track ID
	tkhdA[23] = 1;//track ID
	tkhdA[24] = 0;//зарезервировано
	tkhdA[25] = 0;//зарезервировано
	tkhdA[26] = 0;//зарезервировано
	tkhdA[27] = 0;//зарезервировано
	tkhdA[28] = (audioDurationMilliseconds & 0xFF000000) >> 24;//длительность аудио
	tkhdA[29] = (audioDurationMilliseconds & 0xFF0000) >> 16;//длительность аудио
	tkhdA[30] = (audioDurationMilliseconds & 0xFF00) >> 8;//длительность аудио
	tkhdA[31] = audioDurationMilliseconds & 0xFF;//длительность аудио
	tkhdA[32] = 0;//зарезервировано
	tkhdA[33] = 0;//зарезервировано
	tkhdA[34] = 0;//зарезервировано
	tkhdA[35] = 0;//зарезервировано
	tkhdA[36] = 0;//зарезервировано
	tkhdA[37] = 0;//зарезервировано
	tkhdA[38] = 0;//зарезервировано
	tkhdA[39] = 0;//зарезервировано
	tkhdA[40] = 0;//слой
	tkhdA[41] = 0;//слой
	tkhdA[42] = 0;//тип данных (0 - видео, 1 - аудио, 2 - субтитры)
	tkhdA[43] = 1;//тип данных (0 - видео, 1 - аудио, 2 - субтитры)
	tkhdA[44] = 1;//громкость 1.0
	tkhdA[45] = 0;//громкость 1.0
	tkhdA[46] = 0;//зарезервировано
	tkhdA[47] = 0;//зарезервировано
	tkhdA[48] = 0;//матрица
	tkhdA[49] = 1;//матрица
	tkhdA[50] = 0;//матрица
	tkhdA[51] = 0;//матрица
	tkhdA[52] = 0;//матрица
	tkhdA[53] = 0;//матрица
	tkhdA[54] = 0;//матрица
	tkhdA[55] = 0;//матрица
	tkhdA[56] = 0;//матрица
	tkhdA[57] = 0;//матрица
	tkhdA[58] = 0;//матрица
	tkhdA[59] = 0;//матрица
	tkhdA[60] = 0;//матрица
	tkhdA[61] = 0;//матрица
	tkhdA[62] = 0;//матрица
	tkhdA[63] = 0;//матрица
	tkhdA[64] = 0;//матрица
	tkhdA[65] = 1;//матрица
	tkhdA[66] = 0;//матрица
	tkhdA[67] = 0;//матрица
	tkhdA[68] = 0;//матрица
	tkhdA[69] = 0;//матрица
	tkhdA[70] = 0;//матрица
	tkhdA[71] = 0;//матрица
	tkhdA[72] = 0;//матрица
	tkhdA[73] = 0;//матрица
	tkhdA[74] = 0;//матрица
	tkhdA[75] = 0;//матрица
	tkhdA[76] = 0;//матрица
	tkhdA[77] = 0;//матрица
	tkhdA[78] = 0;//матрица
	tkhdA[79] = 0;//матрица
	tkhdA[80] = 64;//матрица
	tkhdA[81] = 0;//матрица
	tkhdA[82] = 0;//матрица
	tkhdA[83] = 0;//матрица
	tkhdA[84] = 0;//ширина
	tkhdA[85] = 0;//ширина
	tkhdA[86] = 0;//ширина
	tkhdA[87] = 0;//ширина
	tkhdA[88] = 0;//высота
	tkhdA[89] = 0;//высота
	tkhdA[90] = 0;//высота
	tkhdA[91] = 0;//высота
	
	
	//соберём trak
	var trakLengthA = 8 + tkhdA.length + edtsA.length + mdiaA.length;
	trakA = new Uint8Array(trakLengthA);
	trakA[0] = (trakLengthA & 0xFF000000) >> 24;//размер атома
	trakA[1] = (trakLengthA & 0xFF0000) >> 16;//размер атома
	trakA[2] = (trakLengthA & 0xFF00) >> 8;//размер атома
	trakA[3] = trakLengthA & 0xFF;//размер атома
	trakA[4] = 116;//t
	trakA[5] = 114;//r
	trakA[6] = 97;//a
	trakA[7] = 107;//k
	trakA.set(tkhdA, 8);
	trakA.set(edtsA, 8 + tkhdA.length);
	trakA.set(mdiaA, 8 + tkhdA.length + edtsA.length);
	
	
	///соберём видео
	stsdV[0] = 0;
	stsdV[1] = 0;
	stsdV[2] = 0;
	stsdV[3] = 151;
	stsdV[4] = 115;
	stsdV[5] = 116;
	stsdV[6] = 115;
	stsdV[7] = 100;
	stsdV[9] = 0;
	stsdV[9] = 0;
	stsdV[10] = 0;
	stsdV[11] = 0;
	stsdV[12] = 0;
	stsdV[13] = 0;
	stsdV[14] = 0;
	stsdV[15] = 1;
	stsdV[16] = 0;
	stsdV[17] = 0;
	stsdV[18] = 0;
	stsdV[19] = 135;
	stsdV[20] = 97;
	stsdV[21] = 118;
	stsdV[22] = 99;
	stsdV[23] = 49;
	stsdV[24] = 0;
	stsdV[25] = 0;
	stsdV[26] = 0;
	stsdV[27] = 0;
	stsdV[28] = 0;
	stsdV[29] = 0;
	stsdV[30] = 0;
	stsdV[31] = 1;
	stsdV[32] = 0;
	stsdV[33] = 0;
	stsdV[34] = 0;
	stsdV[35] = 0;
	stsdV[36] = 0;
	stsdV[37] = 0;
	stsdV[38] = 0;
	stsdV[39] = 0;
	stsdV[40] = 0;
	stsdV[41] = 0;
	stsdV[42] = 0;
	stsdV[43] = 0;
	stsdV[44] = 0;
	stsdV[45] = 0;
	stsdV[46] = 0;
	stsdV[47] = 0;
	stsdV[48] = 6;
	stsdV[49] = 64;
	stsdV[50] = 3;
	stsdV[51] = 132;
	stsdV[52] = 0;
	stsdV[53] = 72;
	stsdV[54] = 0;
	stsdV[55] = 0;
	stsdV[56] = 0;
	stsdV[57] = 72;
	stsdV[58] = 0;
	stsdV[59] = 0;
	stsdV[60] = 0;
	stsdV[61] = 0;
	stsdV[62] = 0;
	stsdV[63] = 0;
	stsdV[64] = 0;
	stsdV[65] = 1;
	stsdV[66] = 0;
	stsdV[67] = 0;
	stsdV[68] = 0;
	stsdV[69] = 0;
	stsdV[70] = 0;
	stsdV[80] = 0;
	stsdV[81] = 0;
	stsdV[82] = 0;
	stsdV[83] = 0;
	stsdV[84] = 0;
	stsdV[85] = 0;
	stsdV[86] = 0;
	stsdV[87] = 0;
	stsdV[88] = 0;
	stsdV[89] = 0;
	stsdV[90] = 0;
	stsdV[91] = 0;
	stsdV[92] = 0;
	stsdV[93] = 0;
	stsdV[94] = 0;
	stsdV[95] = 0;
	stsdV[96] = 0;
	stsdV[97] = 0;
	stsdV[98] = 0;
	stsdV[99] = 24;
	stsdV[100] = 255;
	stsdV[101] = 255;
	stsdV[102] = 0;
	stsdV[103] = 0;
	stsdV[104] = 0;
	stsdV[105] = 49;
	stsdV[106] = 97;
	stsdV[107] = 118;
	stsdV[108] = 99;
	stsdV[109] = 67;
	stsdV[110] = 1;
	stsdV[111] = 77;
	stsdV[112] = 64;
	stsdV[113] = 31;
	stsdV[114] = 255;
	stsdV[115] = 225;
	stsdV[116] = 0;
	stsdV[117] = 26;
	stsdV[118] = 103;
	stsdV[119] = 77;
	stsdV[120] = 64;
	stsdV[121] = 31;
	stsdV[122] = 236;
	stsdV[123] = 160;
	stsdV[124] = 50;
	stsdV[125] = 3;
	stsdV[126] = 159;
	stsdV[127] = 207;
	stsdV[128] = 128;
	stsdV[129] = 136;
	stsdV[130] = 0;
	stsdV[131] = 0;
	stsdV[132] = 3;
	stsdV[133] = 0;
	stsdV[134] = 8;
	stsdV[135] = 0;
	stsdV[136] = 0;
	stsdV[137] = 3;
	stsdV[138] = 1;
	stsdV[139] = 128;
	stsdV[140] = 120;
	stsdV[141] = 193;
	stsdV[142] = 140;
	stsdV[143] = 176;
	stsdV[144] = 1;
	stsdV[145] = 0;
	stsdV[146] = 4;
	stsdV[147] = 104;
	stsdV[148] = 235;
	stsdV[149] = 236;
	stsdV[150] = 178;
	
	sttsV[0] = 0;//размер атома
    sttsV[1] = 0;//размер атома
	sttsV[2] = 0;//размер атома
	sttsV[3] = 24;//размер атома
	sttsV[4] = 115;//s
	sttsV[5] = 116;//t
	sttsV[6] = 116;//t
	sttsV[7] = 115;//s
	sttsV[8] = 0;//флаг
	sttsV[9] = 0;//флаг
	sttsV[10] = 0;//флаг
	sttsV[11] = 0;//флаг
	sttsV[12] = 0;//количество записей
	sttsV[13] = 0;//количество записей
	sttsV[14] = 0;//количество записей
	sttsV[15] = 1;//количество записей
	sttsV[16] = (sampleCountV & 0xFF000000) >> 24;//количество sample'ов
	sttsV[17] = (sampleCountV & 0xFF0000) >> 16;  //количество sample'ов
	sttsV[18] = (sampleCountV & 0xFF00) >> 8;     //количество sample'ов
	sttsV[19] = (sampleCountV & 0xFF);              //количество sample'ов
	sttsV[20] = 0;//продолжительность sample (delta)
	sttsV[21] = 0;//продолжительность sample (delta)
	sttsV[22] = 2;//продолжительность sample (delta)
	sttsV[23] = 0;//продолжительность sample (delta)
	
	
	
	cttsVLength = 16 + sampleCountV * 8;
	cttsV[0] = (cttsVLength & 0xFF000000) >> 24;//размер атома
	cttsV[1] = (cttsVLength & 0xFF0000) >> 16;  //размер атома
	cttsV[2] = (cttsVLength & 0xFF00) >> 8;     //размер атома
	cttsV[3] = cttsVLength & 0xFF;              //размер атома
	cttsV[4] = 99;//c
	cttsV[5] = 116;//t
	cttsV[6] = 116;//t
	cttsV[7] = 115;//s
	cttsV[8] = 0;//версия
	cttsV[9] = 0;//флаг
	cttsV[10] = 0;//флаг
	cttsV[11] = 0;//флаг
	cttsV[12] = (sampleCountV & 0xFF000000) >> 24;//количество sample'ов
	cttsV[13] = (sampleCountV & 0xFF0000) >> 16;  //количество sample'ов
	cttsV[14] = (sampleCountV & 0xFF00) >> 8;     //количество sample'ов
	cttsV[15] = sampleCountV & 0xFF;              //количество sample'ов
	var count = 1;
	for (j = 0; j < PTSsV.length; j++)
	{
		if(PTSsV[j] > DTSsV[j])
		{
			cttsV[16 + (count - 1) * 8] = 0;//количество sample'ов
			cttsV[16 + (count - 1) * 8 + 1] = 0;  //количество sample'ов
			cttsV[16 + (count - 1) * 8 + 2] = 0;     //количество sample'ов
			cttsV[16 + (count - 1) * 8 + 3] = 1;              //количество sample'ов
			if (DTSsV[j] != 0)
			{
				var sampleDuration = Math.round((PTSsV[j] - DTSsV[j]) * videoRatioDelta);
				cttsV[16 + (count - 1) * 8 + 4] = (sampleDuration & 0xFF000000) >> 24;//продолжительность семпла
				cttsV[16 + (count - 1) * 8 + 5] = (sampleDuration & 0xFF0000) >> 16;  //продолжительность семпла
				cttsV[16 + (count - 1) * 8 + 6] = (sampleDuration & 0xFF00) >> 8;     //продолжительность семпла
				cttsV[16 + (count - 1) * 8 + 7] = sampleDuration & 0xFF;              //продолжительность семпла
			}
			else
			{
				cttsV[16 + (count - 1) * 8 + 4] = 0;//продолжительность семпла
				cttsV[16 + (count - 1) * 8 + 5] = 0;  //продолжительность семпла
				cttsV[16 + (count - 1) * 8 + 6] = 0;     //продолжительность семпла
				cttsV[16 + (count - 1) * 8 + 7] = 0;              //продолжительность семпла
			}
			count++;
		}
	}
	
	
	stscV[0] = 0;//размер атома
	stscV[1] = 0;//размер атома
	stscV[2] = 0;//размер атома
	stscV[3] = 28;//размер атома
	stscV[4] = 115;//s
	stscV[5] = 116;//t
	stscV[6] = 115;//s
	stscV[7] = 99;//c
	stscV[8] = 0;//флаг
	stscV[9] = 0;//флаг
	stscV[10] = 0;//флаг
	stscV[11] = 0;//флаг
	stscV[12] = 0;//количество записей
	stscV[13] = 0;//количество записей
	stscV[14] = 0;//количество записей
	stscV[15] = 1;//количество записей
	stscV[16] = 0;//первый кусок
	stscV[17] = 0;//первый кусок
	stscV[18] = 0;//первый кусок
	stscV[19] = 1;//первый кусок
	stscV[20] = (sampleCountV & 0xFF000000) >> 24;//количество sample'ов в куске
	stscV[21] = (sampleCountV & 0xFF0000) >> 16;  //количество sample'ов в куске
	stscV[22] = (sampleCountV & 0xFF00) >> 8;     //количество sample'ов в куске
	stscV[23] = sampleCountV & 0xFF;              //количество sample'ов в куске
	stscV[24] = 0;//ID sample
	stscV[25] = 0;//ID sample
	stscV[26] = 0;//ID sample
	stscV[27] = 1;//ID sample
	
	
	var stszSizeV = 20 + sampleCountV * 4;
	stszV[0] = (stszSizeV & 0xFF000000) >> 24;//размер атома
	stszV[1] = (stszSizeV & 0xFF0000) >> 16;  //размер атома
	stszV[2] = (stszSizeV & 0xFF00) >> 8;     //размер атома
	stszV[3] = stszSizeV & 0xFF;              //размер атома
	stszV[4] = 115;//s
	stszV[5] = 116;//t
	stszV[6] = 115;//s
	stszV[7] = 122;//z
	stszV[8] = 0;//версия
	stszV[9] = 0;//версия
	stszV[10] = 0;//версия
	stszV[11] = 0;//версия
	stszV[12] = 0;//флаг
	stszV[13] = 0;//флаг
	stszV[14] = 0;//флаг
	stszV[15] = 0;//флаг
	stszV[16] = (sampleCountV & 0xFF000000) >> 24;//количество sample'ов
	stszV[17] = (sampleCountV & 0xFF0000) >> 16;  //количество sample'ов
	stszV[18] = (sampleCountV & 0xFF00) >> 8;     //количество sample'ов
	stszV[19] = sampleCountV & 0xFF;              //количество sample'ов
	for (j = 0; j < sizeSamplesV.length; j++)
	{
		stszV[20 + j * 4] = (sizeSamplesV[j] & 0xFF000000) >> 24;    //размер sample'а
		stszV[20 + j * 4 + 1] = (sizeSamplesV[j] & 0xFF0000) >> 16;  //размер sample'а
		stszV[20 + j * 4 + 2] = (sizeSamplesV[j] & 0xFF00) >> 8;     //размер sample'а
		stszV[20 + j * 4 + 3] = sizeSamplesV[j] & 0xFF;              //размер sample'а
	}
	

	stcoV[0] = 0;//размер атома
	stcoV[1] = 0;  //размер атома
	stcoV[2] = 0;     //размер атома
	stcoV[3] = 20;              //размер атома
	stcoV[4] = 115;//s
	stcoV[5] = 116;//t
	stcoV[6] = 99;//c
	stcoV[7] = 111;//o
	stcoV[8] = 0;//флаг
	stcoV[9] = 0;//флаг
	stcoV[10] = 0;//флаг
	stcoV[11] = 0;//флаг
	stcoV[12] = 0;//число кусков
	stcoV[13] = 0;//число кусков
	stcoV[14] = 0;//число кусков
	stcoV[15] = 1;//число кусков
	stcoV[16] = ((ftyp.length + free.length + audioLength + 8) & 0xFF000000) >> 24;//указатель на начало данных
	stcoV[17] = ((ftyp.length + free.length + audioLength + 8) & 0xFF0000) >> 16;  //указатель на начало данных
	stcoV[18] = ((ftyp.length + free.length + audioLength + 8) & 0xFF00) >> 8;     //указатель на начало данных
	stcoV[19] = (ftyp.length + free.length + audioLength + 8) & 0xFF;              //указатель на начало данных
	
	
	//соберём stbl
	var stblLengthV = 8 + stsdV.length + sttsV.length + cttsV.length + stscV.length + stszV.length + stcoV.length;
	stblV = new Uint8Array(stblLengthV);
	stblV[0] = (stblLengthV & 0xFF000000) >> 24;//размер атома
	stblV[1] = (stblLengthV & 0xFF0000) >> 16;  //размер атома
	stblV[2] = (stblLengthV & 0xFF00) >> 8;     //размер атома
	stblV[3] = stblLengthV & 0xFF;              //размер атома
	stblV[4] = 115;//s
	stblV[5] = 116;//t
	stblV[6] = 98;//b
	stblV[7] = 108;//l
	stblV.set(stsdV, 8);
	stblV.set(sttsV, 8 + stsdV.length);
	stblV.set(cttsV, 8 + stsdV.length + sttsV.length);
	stblV.set(stscV, 8 + stsdV.length + sttsV.length + cttsV.length);
	stblV.set(stszV, 8 + stsdV.length + sttsV.length + cttsV.length + stscV.length);
	stblV.set(stcoV, 8 + stsdV.length + sttsV.length + cttsV.length + stscV.length + stszV.length);
	
	
	dinfV[0] = 0;
	dinfV[1] = 0;
	dinfV[2] = 0;
	dinfV[3] = 36;
	dinfV[4] = 100;
	dinfV[5] = 105;
	dinfV[6] = 110;
	dinfV[7] = 102;
	dinfV[9] = 0;
	dinfV[9] = 0;
	dinfV[10] = 0;
	dinfV[11] = 28;
	dinfV[12] = 100;
	dinfV[13] = 114;
	dinfV[14] = 101;
	dinfV[15] = 102;
	dinfV[16] = 0;
	dinfV[17] = 0;
	dinfV[18] = 0;
	dinfV[19] = 0;
	dinfV[20] = 0;
	dinfV[21] = 0;
	dinfV[22] = 0;
	dinfV[23] = 1;
	dinfV[24] = 0;
	dinfV[25] = 0;
	dinfV[26] = 0;
	dinfV[27] = 12;
	dinfV[28] = 117;
	dinfV[29] = 114;
	dinfV[30] = 108;
	dinfV[31] = 32;
	dinfV[32] = 0;
	dinfV[33] = 0;
	dinfV[34] = 0;
	dinfV[35] = 1;
	
	vmhdV[0] = 0;
	vmhdV[1] = 0;
	vmhdV[2] = 0;
	vmhdV[3] = 20;
	vmhdV[4] = 118;
	vmhdV[5] = 109;
	vmhdV[6] = 104;
	vmhdV[7] = 100;
	vmhdV[9] = 0;
	vmhdV[9] = 0;
	vmhdV[10] = 0;
	vmhdV[11] = 1;
	vmhdV[12] = 0;
	vmhdV[13] = 0;
	vmhdV[14] = 0;
	vmhdV[15] = 0;
	vmhdV[16] = 0;
	vmhdV[17] = 0;
	vmhdV[18] = 0;
	vmhdV[19] = 0;
	
	//соберём minf
	var minfLengthV = 8 + vmhdV.length + dinfV.length + stblV.length;
	minfV = new Uint8Array(minfLengthV);
	minfV[0] = (minfLengthV & 0xFF000000) >> 24;//размер атома
	minfV[1] = (minfLengthV & 0xFF0000) >> 16;//размер атома
	minfV[2] = (minfLengthV & 0xFF00) >> 8;//размер атома
	minfV[3] = minfLengthV & 0xFF;//размер атома
	minfV[4] = 109;//m
	minfV[5] = 105;//i
	minfV[6] = 110;//n
	minfV[7] = 102;//f
	minfV.set(vmhdV, 8);
	minfV.set(dinfV, 8 + vmhdV.length);
	minfV.set(stblV, 8 + vmhdV.length + dinfV.length);
	
	hdlrV[0] = 0;
	hdlrV[1] = 0;
	hdlrV[2] = 0;
	hdlrV[3] = 45;
	hdlrV[4] = 104;
	hdlrV[5] = 100;
	hdlrV[6] = 108;
	hdlrV[7] = 114;
	hdlrV[9] = 0;
	hdlrV[9] = 0;
	hdlrV[10] = 0;
	hdlrV[11] = 0;
	hdlrV[12] = 0;
	hdlrV[13] = 0;
	hdlrV[14] = 0;
	hdlrV[15] = 0;
	hdlrV[16] = 118;
	hdlrV[17] = 105;
	hdlrV[18] = 100;
	hdlrV[19] = 101;
	hdlrV[20] = 0;
	hdlrV[21] = 0;
	hdlrV[22] = 0;
	hdlrV[23] = 0;
	hdlrV[24] = 0;
	hdlrV[25] = 0;
	hdlrV[26] = 0;
	hdlrV[27] = 0;
	hdlrV[28] = 0;
	hdlrV[29] = 0;
	hdlrV[30] = 0;
	hdlrV[31] = 0;
	hdlrV[32] = 86;
	hdlrV[33] = 105;
	hdlrV[34] = 100;
	hdlrV[35] = 101;
	hdlrV[36] = 111;
	hdlrV[37] = 72;
	hdlrV[38] = 97;
	hdlrV[39] = 110;
	hdlrV[40] = 100;
	hdlrV[41] = 108;
	hdlrV[42] = 101;
	hdlrV[43] = 114;
	hdlrV[44] = 0;
	
	mdhdV[0] = 0;//размер атома
	mdhdV[1] = 0;//размер атома
	mdhdV[2] = 0;//размер атома
	mdhdV[3] = 32;//размер атома
	mdhdV[4] = 109;//m
	mdhdV[5] = 100;//d
	mdhdV[6] = 104;//h
	mdhdV[7] = 100;//d
	mdhdV[8] = 0;//версия
	mdhdV[9] = 0;//флаг
	mdhdV[10] = 0;//флаг
	mdhdV[11] = 0;//флаг
	mdhdV[12] = 0;//время создания
	mdhdV[13] = 0;//время создания
	mdhdV[14] = 0;//время создания
	mdhdV[15] = 0;//время создания
	mdhdV[16] = 0;//время изменения
	mdhdV[17] = 0;//время изменения
	mdhdV[18] = 0;//время изменения
	mdhdV[19] = 0;//время изменения
	mdhdV[20] = ((videoTimeScaleMDHD) & 0xFF000000) >> 24;//time scale
	mdhdV[21] = ((videoTimeScaleMDHD) & 0xFF0000) >> 16;//time scale
	mdhdV[22] = ((videoTimeScaleMDHD) & 0xFF00) >> 8;//time scale
	mdhdV[23] = (videoTimeScaleMDHD) & 0xFF;//time scale
	mdhdV[24] = ((videoDurationMDHD) & 0xFF000000) >> 24;
	mdhdV[25] = ((videoDurationMDHD) & 0xFF0000) >> 16;
	mdhdV[26] = ((videoDurationMDHD) & 0xFF00) >> 8;
	mdhdV[27] = (videoDurationMDHD) & 0xFF;
	mdhdV[28] = 85;//язык
	mdhdV[29] = 196;//язык
	mdhdV[30] = 0;//Quality
	mdhdV[31] = 0;//Quality
	
	//соберём mdia
	var mdiaLengthV = 8 + mdhdV.length + hdlrV.length + minfV.length;
	mdiaV = new Uint8Array(mdiaLengthV);
	mdiaV[0] = (mdiaLengthV & 0xFF000000) >> 24;//размер атома
	mdiaV[1] = (mdiaLengthV & 0xFF0000) >> 16;//размер атома
	mdiaV[2] = (mdiaLengthV & 0xFF00) >> 8;//размер атома
	mdiaV[3] = mdiaLengthV & 0xFF;//размер атома
	mdiaV[4] = 109;//m
	mdiaV[5] = 100;//d
	mdiaV[6] = 105;//i
	mdiaV[7] = 97;//a
	mdiaV.set(mdhdV, 8);
	mdiaV.set(hdlrV, 8 + mdhdV.length);
	mdiaV.set(minfV, 8 + mdhdV.length + hdlrV.length);
	
	
	var videoDuration = sampleCountV * 512 * 1000 / 12288;
	elstV[0] = 0;//размер атома
	elstV[1] = 0;//размер атома
	elstV[2] = 0;//размер атома
	elstV[3] = 28;//размер атома
	elstV[4] = 101;//e
	elstV[5] = 108;//l
	elstV[6] = 115;//s
	elstV[7] = 116;//t
	elstV[8] = 0;//версия
	elstV[9] = 0;//флаг
	elstV[10] = 0;//флаг
	elstV[11] = 0;//флаг
	elstV[12] = 0;//количество
	elstV[13] = 0;//количество
	elstV[14] = 0;//количество
	elstV[15] = 1;//количество
	elstV[16] = (videoDurationMilliseconds & 0xFF000000) >> 24;//длительность видео
	elstV[17] = (videoDurationMilliseconds & 0xFF0000) >> 16;//длительность видео
	elstV[18] = (videoDurationMilliseconds & 0xFF00) >> 8;//длительность видео
	elstV[19] = videoDurationMilliseconds & 0xFF;//длительность видео
	elstV[20] = 0;//начальное время
	elstV[21] = 0;//начальное время
	elstV[22] = 0;//начальное время
	elstV[23] = 0;//начальное время
	elstV[24] = 0;//скорость видео 01.00
	elstV[25] = 1;//скорость видео 01.00
	elstV[26] = 0;//скорость видео 01.00
	elstV[27] = 0;//скорость видео 01.00

	//соберём edts
	var edtsLengthV = 8 + elstV.length;
	edtsV = new Uint8Array(edtsLengthV);
	edtsV[0] = (edtsLengthV & 0xFF000000) >> 24;//размер атома
	edtsV[1] = (edtsLengthV & 0xFF0000) >> 16;//размер атома
	edtsV[2] = (edtsLengthV & 0xFF00) >> 8;//размер атома
	edtsV[3] = edtsLengthV & 0xFF;//размер атома
	edtsV[4] = 101;//e
	edtsV[5] = 100;//d
	edtsV[6] = 116;//t
	edtsV[7] = 115;//s
	edtsV.set(elstV, 8);
	
	
	tkhdV[0] = 0;//размер атома
	tkhdV[1] = 0;//размер атома
	tkhdV[2] = 0;//размер атома
	tkhdV[3] = 92;//размер атома
	tkhdV[4] = 116;//t
	tkhdV[5] = 107;//k
	tkhdV[6] = 104;//h
	tkhdV[7] = 100;//d
	tkhdV[8] = 0;//версия
	tkhdV[9] = 0;//флаги
	tkhdV[10] = 0;//флаги
	tkhdV[11] = 15;//флаги
	tkhdV[12] = 0;//время создания
	tkhdV[13] = 0;//время создания
	tkhdV[14] = 0;//время создания
	tkhdV[15] = 0;//время создания
	tkhdV[16] = 0;//время изменения
	tkhdV[17] = 0;//время изменения
	tkhdV[18] = 0;//время изменения
	tkhdV[19] = 0;//время изменения
	tkhdV[20] = 0;//track ID
	tkhdV[21] = 0;//track ID
	tkhdV[22] = 0;//track ID
	tkhdV[23] = 2;//track ID
	tkhdV[24] = 0;//зарезервировано
	tkhdV[25] = 0;//зарезервировано
	tkhdV[26] = 0;//зарезервировано
	tkhdV[27] = 0;//зарезервировано
	tkhdV[28] = (videoDurationMilliseconds & 0xFF000000) >> 24;//длительность аудио
	tkhdV[29] = (videoDurationMilliseconds & 0xFF0000) >> 16;//длительность аудио
	tkhdV[30] = (videoDurationMilliseconds & 0xFF00) >> 8;//длительность аудио
	tkhdV[31] = videoDurationMilliseconds & 0xFF;//длительность аудио
	tkhdV[32] = 0;//зарезервировано
	tkhdV[33] = 0;//зарезервировано
	tkhdV[34] = 0;//зарезервировано
	tkhdV[35] = 0;//зарезервировано
	tkhdV[36] = 0;//зарезервировано
	tkhdV[37] = 0;//зарезервировано
	tkhdV[38] = 0;//зарезервировано
	tkhdV[39] = 0;//зарезервировано
	tkhdV[40] = 0;//слой
	tkhdV[41] = 0;//слой
	tkhdV[42] = 0;//тип данных (0 - видео, 1 - аудио, 2 - субтитры)
	tkhdV[43] = 0;//тип данных (0 - видео, 1 - аудио, 2 - субтитры)
	tkhdV[44] = 0;//громкость 0.0
	tkhdV[45] = 0;//громкость 0.0
	tkhdV[46] = 0;//зарезервировано
	tkhdV[47] = 0;//зарезервировано
	tkhdV[48] = 0;//матрица
	tkhdV[49] = 1;//матрица
	tkhdV[50] = 0;//матрица
	tkhdV[51] = 0;//матрица
	tkhdV[52] = 0;//матрица
	tkhdV[53] = 0;//матрица
	tkhdV[54] = 0;//матрица
	tkhdV[55] = 0;//матрица
	tkhdV[56] = 0;//матрица
	tkhdV[57] = 0;//матрица
	tkhdV[58] = 0;//матрица
	tkhdV[59] = 0;//матрица
	tkhdV[60] = 0;//матрица
	tkhdV[61] = 0;//матрица
	tkhdV[62] = 0;//матрица
	tkhdV[63] = 0;//матрица
	tkhdV[64] = 0;//матрица
	tkhdV[65] = 1;//матрица
	tkhdV[66] = 0;//матрица
	tkhdV[67] = 0;//матрица
	tkhdV[68] = 0;//матрица
	tkhdV[69] = 0;//матрица
	tkhdV[70] = 0;//матрица
	tkhdV[71] = 0;//матрица
	tkhdV[72] = 0;//матрица
	tkhdV[73] = 0;//матрица
	tkhdV[74] = 0;//матрица
	tkhdV[75] = 0;//матрица
	tkhdV[76] = 0;//матрица
	tkhdV[77] = 0;//матрица
	tkhdV[78] = 0;//матрица
	tkhdV[79] = 0;//матрица
	tkhdV[80] = 64;//матрица
	tkhdV[81] = 0;//матрица
	tkhdV[82] = 0;//матрица
	tkhdV[83] = 0;//матрица
	tkhdV[84] = 6;//ширина
	tkhdV[85] = 64;//ширина
	tkhdV[86] = 0;//ширина
	tkhdV[87] = 0;//ширина
	tkhdV[88] = 3;//высота
	tkhdV[89] = 132;//высота
	tkhdV[90] = 0;//высота
	tkhdV[91] = 0;//высота

	//соберём trak
	var trakLengthV = 8 + tkhdV.length + edtsV.length + mdiaV.length;
	trakV = new Uint8Array(trakLengthV);
	trakV[0] = (trakLengthV & 0xFF000000) >> 24;//размер атома
	trakV[1] = (trakLengthV & 0xFF0000) >> 16;//размер атома
	trakV[2] = (trakLengthV & 0xFF00) >> 8;//размер атома
	trakV[3] = trakLengthV & 0xFF;//размер атома
	trakV[4] = 116;//t
	trakV[5] = 114;//r
	trakV[6] = 97;//a
	trakV[7] = 107;//k
	trakV.set(tkhdV, 8, tkhdV.length);
	trakV.set(edtsV, 8 + tkhdV.length, edtsV.length);
	trakV.set(mdiaV, 8 + tkhdV.length + edtsV.length, mdiaV.length);
	
	
	///
	
	//соберём аудио и видео вместе в moov
	mvhd[0] = 0;//размер атома
	mvhd[1] = 0;//размер атома
	mvhd[2] = 0;//размер атома
	mvhd[3] = 108;//размер атома
	mvhd[4] = 109;//m
	mvhd[5] = 118;//v
	mvhd[6] = 104;//h
	mvhd[7] = 100;//d
	mvhd[8] = 0;//версия
	mvhd[9] = 0;//флаги
	mvhd[10] = 0;//флаги
	mvhd[11] = 0;//флаги
	mvhd[12] = 0;//время создания
	mvhd[13] = 0;//время создания
	mvhd[14] = 0;//время создания
	mvhd[15] = 0;//время создания
	mvhd[16] = 0;//время изменения
	mvhd[17] = 0;//время изменения
	mvhd[18] = 0;//время изменения
	mvhd[19] = 0;//время изменения
	mvhd[20] = 0;//сколько в одной секунде
	mvhd[21] = 0;//сколько в одной секунде
	mvhd[22] = 3;//сколько в одной секунде
	mvhd[23] = 232;//сколько в одной секунде
	mvhd[24] = (audioDuration & 0xFF000000) >> 24;//длительность
	mvhd[25] = (audioDuration & 0xFF0000) >> 16;//длительность
	mvhd[26] = (audioDuration & 0xFF00) >> 8;//длительность
	mvhd[27] = audioDuration & 0xFF;//длительность
	mvhd[28] = 0;//скорость
	mvhd[29] = 1;//скорость
	mvhd[30] = 0;//скорость
	mvhd[31] = 0;//скорость
	mvhd[32] = 1;//громкость
	mvhd[33] = 0;//громкость
	mvhd[34] = 0;//зарезервировано
	mvhd[35] = 0;//зарезервировано
	mvhd[36] = 0;//зарезервировано
	mvhd[37] = 0;//зарезервировано
	mvhd[38] = 0;//зарезервировано
	mvhd[39] = 0;//зарезервировано
	mvhd[40] = 0;//зарезервировано
	mvhd[41] = 0;//зарезервировано
	mvhd[42] = 0;//зарезервировано
	mvhd[43] = 0;//зарезервировано
	mvhd[44] = 0;//матрица
	mvhd[45] = 1;//матрица
	mvhd[46] = 0;//матрица
	mvhd[47] = 0;//матрица
	mvhd[48] = 0;//матрица
	mvhd[49] = 0;//матрица
	mvhd[50] = 0;//матрица
	mvhd[51] = 0;//матрица
	mvhd[52] = 0;//матрица
	mvhd[53] = 0;//матрица
	mvhd[54] = 0;//матрица
	mvhd[55] = 0;//матрица
	mvhd[56] = 0;//матрица
	mvhd[57] = 0;//матрица
	mvhd[58] = 0;//матрица
	mvhd[59] = 0;//матрица
	mvhd[60] = 0;//матрица
	mvhd[61] = 1;//матрица
	mvhd[62] = 0;//матрица
	mvhd[63] = 0;//матрица
	mvhd[64] = 0;//матрица
	mvhd[65] = 0;//матрица
	mvhd[66] = 0;//матрица
	mvhd[67] = 0;//матрица
	mvhd[68] = 0;//матрица
	mvhd[69] = 0;//матрица
	mvhd[70] = 0;//матрица
	mvhd[71] = 0;//матрица
	mvhd[72] = 0;//матрица
	mvhd[73] = 0;//матрица
	mvhd[74] = 0;//матрица
	mvhd[75] = 0;//матрица
	mvhd[76] = 64;//матрица
	mvhd[77] = 0;//матрица
	mvhd[78] = 0;//матрица
	mvhd[79] = 0;//матрица
	mvhd[80] = 0;//
	mvhd[81] = 0;//
	mvhd[82] = 0;//
	mvhd[83] = 0;//
	mvhd[84] = 0;//
	mvhd[85] = 0;//
	mvhd[86] = 0;//
	mvhd[87] = 0;//
	mvhd[88] = 0;//
	mvhd[89] = 0;//
	mvhd[90] = 0;//
	mvhd[91] = 0;//
	mvhd[92] = 0;//
	mvhd[93] = 0;//
	mvhd[94] = 0;//
	mvhd[95] = 0;//
	mvhd[96] = 0;//
	mvhd[97] = 0;//
	mvhd[98] = 0;//
	mvhd[99] = 0;//
	mvhd[100] = 0;//
	mvhd[101] = 0;//
	mvhd[102] = 0;//
	mvhd[103] = 0;//
	mvhd[104] = 0;//следующий ID трека
	mvhd[105] = 0;//следующий ID трека
	mvhd[106] = 0;//следующий ID трека
	mvhd[107] = 3;//следующий ID трека
	
	 //соберём moov
	var moovLength = 8 + mvhd.length + trakA.length + trakV.length;
	moov = new Uint8Array(moovLength);
	moov[0] = (moovLength & 0xFF000000) >> 24;//размер атома
	moov[1] = (moovLength & 0xFF0000) >> 16;//размер атома
	moov[2] = (moovLength & 0xFF00) >> 8;//размер атома
	moov[3] = moovLength & 0xFF;//размер атома
	moov[4] = 109;//m
	moov[5] = 111;//o
	moov[6] = 111;//o
	moov[7] = 118;//v
	moov.set(mvhd, 8);
	moov.set(trakA, 8 + mvhd.length);
	moov.set(trakV, 8 + mvhd.length + trakA.length);

	//соберём mp4
	mp4.set(moov, mp4CurrentSize);
	mp4CurrentSize += moov.length;
	
	
	
	
	//alert(audioLength + " " + videoLength + " " + mp4CurrentSize);

	//alert(PTSsA.length + " " + sampleCountA + " " + PTSsV.length + " " + sampleCountV);
	
	
	
	
	
	
	var DT1 = new Date();
	//alert("Время обработки: " + (DT1 - DT0) + " мс");
	
	//отладочный код создания файла чистого потока и скачивания этого файла браузером (работает безотказно в опере)
	var ddd = new Uint8Array(mp4CurrentSize);
	for (var i = 0; i < ddd.length; i++)
	{
		ddd[i] = mp4[i];
	}	
	
	var blob = new Blob([ddd], {type: "application/octet-stream"}),
    url = window.URL.createObjectURL(blob);
	
	document.getElementById('videoplayer').setAttribute('src', url);
	document.getElementById('videoplayer').load();
	document.getElementById('videoplayer').play();
	
	
	/*var saveData = (function () {
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
        saveData(ddd, "xxxxxx.mp4");*/
}

function compareNumeric(a, b) 
{
  if (a > b) return 1;
  if (a < b) return -1;
}