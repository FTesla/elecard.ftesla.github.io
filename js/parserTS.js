var mp4Buffer1;
var mp4Buffer2;
var currentBuffer = 1;
var mp4 = new Uint8Array();
var mp4CurrentSize = 0;
var nextTS = true;//семафор для обработки TS
var one = true;//выполняется один раз

var indexSegment = 0;
// Source and buffers
var mediaSource;
var videoSource;

var videoElement;

var initSize = 0;
var blokSize = 0;
var ch = 0;

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
	mp4 = new Uint8Array(fileByte.length);
	mp4CurrentSize = 0;
	
	//атомы
	var ftyp = new Array();
	var free = new Array();
	var moov = new Array();
	var mvhd = new Array();
	
	var mvex = new Array();
	
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
	var stblA = new Array();
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
	
	if(one == true)
	{
		//one = false;
		

		ftyp[0] = 0;
		ftyp[1] = 0;
		ftyp[2] = 0;
		ftyp[3] = 28;
		ftyp[4] = 102;
		ftyp[5] = 116;
		ftyp[6] = 121;
		ftyp[7] = 112;
		ftyp[8] = 105;
		ftyp[9] = 115;
		ftyp[10] = 111;
		ftyp[11] = 53;
		ftyp[12] = 0;
		ftyp[13] = 0;
		ftyp[14] = 0;
		ftyp[15] = 1;
		ftyp[16] = 97;
		ftyp[17] = 118;
		ftyp[18] = 99;
		ftyp[19] = 49;
		ftyp[20] = 105;
		ftyp[21] = 115;
		ftyp[22] = 111;
		ftyp[23] = 53;
		ftyp[24] = 100;
		ftyp[25] = 97;
		ftyp[26] = 115;
		ftyp[27] = 104;
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
		
		
		//соберём trac видео
		
		stsdV[0] = 0;
		stsdV[1] = 0;
		stsdV[2] = 0;
		stsdV[3] = 177;
		stsdV[4] = 115;
		stsdV[5] = 116;
		stsdV[6] = 115;
		stsdV[7] = 100;
		stsdV[8] = 0;
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
		stsdV[19] = 161;
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
		stsdV[48] = 15;
		stsdV[49] = 0;
		stsdV[50] = 8;
		stsdV[51] = 112;
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
		stsdV[71] = 0;
		stsdV[72] = 0;
		stsdV[73] = 0;
		stsdV[74] = 0;
		stsdV[75] = 0;
		stsdV[76] = 0;
		stsdV[77] = 0;
		stsdV[78] = 0;
		stsdV[79] = 0;
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
		stsdV[105] = 16;
		stsdV[106] = 112;
		stsdV[107] = 97;
		stsdV[108] = 115;
		stsdV[109] = 112;
		stsdV[110] = 0;
		stsdV[111] = 0;
		stsdV[112] = 0;
		stsdV[113] = 16;
		stsdV[114] = 0;
		stsdV[115] = 0;
		stsdV[116] = 0;
		stsdV[117] = 15;
		stsdV[118] = 0;
		stsdV[119] = 0;
		stsdV[120] = 0;
		stsdV[121] = 59;
		stsdV[122] = 97;
		stsdV[123] = 118;
		stsdV[124] = 99;
		stsdV[125] = 67;
		stsdV[126] = 1;
		stsdV[127] = 100;
		stsdV[128] = 0;
		stsdV[129] = 40;
		stsdV[130] = 255;
		stsdV[131] = 225;
		stsdV[132] = 0;
		stsdV[133] = 31;
		stsdV[134] = 103;
		stsdV[135] = 100;
		stsdV[136] = 0;
		stsdV[137] = 40;
		stsdV[138] = 172;
		stsdV[139] = 202;
		stsdV[140] = 80;
		stsdV[141] = 15;
		stsdV[142] = 0;
		stsdV[143] = 16;
		stsdV[144] = 251;
		stsdV[145] = 255;
		stsdV[146] = 0;
		stsdV[147] = 16;
		stsdV[148] = 0;
		stsdV[149] = 15;
		stsdV[150] = 16;
		stsdV[151] = 0;
		stsdV[152] = 0;
		stsdV[153] = 3;
		stsdV[154] = 0;
		stsdV[155] = 16;
		stsdV[156] = 0;
		stsdV[157] = 0;
		stsdV[158] = 3;
		stsdV[159] = 3;
		stsdV[160] = 32;
		stsdV[161] = 241;
		stsdV[162] = 131;
		stsdV[163] = 25;
		stsdV[164] = 96;
		stsdV[165] = 1;
		stsdV[166] = 0;
		stsdV[167] = 5;
		stsdV[168] = 104;
		stsdV[169] = 233;
		stsdV[170] = 35;
		stsdV[171] = 44;
		stsdV[172] = 139;
		stsdV[173] = 252;
		stsdV[174] = 248;
		stsdV[175] = 248;
		stsdV[176] = 0;
		
		sttsV[0] = 0;//размер атома
		sttsV[1] = 0;//размер атома
		sttsV[2] = 0;//размер атома
		sttsV[3] = 16;//размер атома
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
		sttsV[15] = 0;//количество записей
		
		stscV[0] = 0;//размер атома
		stscV[1] = 0;//размер атома
		stscV[2] = 0;//размер атома
		stscV[3] = 16;//размер атома
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
		stscV[15] = 0;//количество записей
		
		stszV[0] = 0;//размер атома
		stszV[1] = 0;  //размер атома
		stszV[2] = 0;     //размер атома
		stszV[3] = 20;              //размер атома
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
		stszV[16] = 0;//количество sample'ов
		stszV[17] = 0;  //количество sample'ов
		stszV[18] = 0;     //количество sample'ов
		stszV[19] = 0;              //количество sample'ов
		
		stcoV[0] = 0;//размер атома
		stcoV[1] = 0;  //размер атома
		stcoV[2] = 0;     //размер атома
		stcoV[3] = 16;              //размер атома
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
		stcoV[15] = 0;//число кусков
		
		//соберём stbl
		var stblLengthV = 8 + stsdV.length + sttsV.length + stscV.length + stszV.length + stcoV.length;
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
		stblV.set(stscV, 8 + stsdV.length + sttsV.length);
		stblV.set(stszV, 8 + stsdV.length + sttsV.length + stscV.length);
		stblV.set(stcoV, 8 + stsdV.length + sttsV.length + stscV.length + stszV.length);

		
		dinfV[0] = 0;
		dinfV[1] = 0;
		dinfV[2] = 0;
		dinfV[3] = 36;
		dinfV[4] = 100;
		dinfV[5] = 105;
		dinfV[6] = 110;
		dinfV[7] = 102;
		dinfV[8] = 0;
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
		vmhdV[8] = 0;
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
		hdlrV[8] = 0;
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
		mdhdV[20] = 0;//time scale 90000
		mdhdV[21] = 1;//time scale 90000
		mdhdV[22] = 95;//time scale 90000
		mdhdV[23] = 144;//time scale 90000
		mdhdV[24] = 0;
		mdhdV[25] = 0;
		mdhdV[26] = 0;
		mdhdV[27] = 0;
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
		
		
		elstV[0] = 0;//размер атома
		elstV[1] = 0;//размер атома
		elstV[2] = 0;//размер атома
		elstV[3] = 40;//размер атома
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
		elstV[15] = 2;//количество
		elstV[16] = 0;//?
		elstV[17] = 0;//?
		elstV[18] = 0;//?
		elstV[19] = 46;//?
		elstV[20] = 255;//512
		elstV[21] = 255;//512
		elstV[22] = 255;//512
		elstV[23] = 255;//512
		elstV[24] = 0;
		elstV[25] = 1;
		elstV[26] = 0;
		elstV[27] = 0;
		elstV[28] = 0;
		elstV[29] = 0;
		elstV[30] = 0;
		elstV[31] = 0;
		elstV[32] = 0;
		elstV[33] = 0;
		elstV[34] = 28;
		elstV[35] = 32;
		elstV[36] = 0;
		elstV[37] = 1;
		elstV[38] = 0;
		elstV[39] = 0;

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
		tkhdV[11] = 3;//флаги
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
		tkhdV[23] = 1;//track ID
		tkhdV[24] = 0;//зарезервировано
		tkhdV[25] = 0;//зарезервировано
		tkhdV[26] = 0;//зарезервировано
		tkhdV[27] = 0;//зарезервировано
		tkhdV[28] = 0;//длительность видео
		tkhdV[29] = 0;//длительность видео
		tkhdV[30] = 0;//длительность видео
		tkhdV[31] = 0;//длительность видео
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
		tkhdV[84] = 16;//ширина
		tkhdV[85] = 0;//ширина
		tkhdV[86] = 0;//ширина
		tkhdV[87] = 0;//ширина
		tkhdV[88] = 8;//высота
		tkhdV[89] = 112;//высота
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
		
		
		mvex[0] = 0;
		mvex[1] = 0;
		mvex[2] = 0;
		mvex[3] = 120;
		mvex[4] = 109;
		mvex[5] = 118;
		mvex[6] = 101;
		mvex[7] = 120;
		mvex[8] = 0;
		mvex[9] = 0;
		mvex[10] = 0;
		mvex[11] = 16;
		mvex[12] = 109;
		mvex[13] = 101;
		mvex[14] = 104;
		mvex[15] = 100;
		mvex[16] = 0;
		mvex[17] = 0;
		mvex[18] = 0;
		mvex[19] = 0;
		mvex[20] = 0;
		mvex[21] = 0;
		mvex[22] = 15;
		mvex[23] = 206;
		mvex[24] = 0;
		mvex[25] = 0;
		mvex[26] = 0;
		mvex[27] = 32;
		mvex[28] = 116;
		mvex[29] = 114;
		mvex[30] = 101;
		mvex[31] = 120;
		mvex[32] = 0;
		mvex[33] = 0;
		mvex[34] = 0;
		mvex[35] = 0;
		mvex[36] = 0;
		mvex[37] = 0;
		mvex[38] = 0;
		mvex[39] = 1;
		mvex[40] = 0;
		mvex[41] = 0;
		mvex[42] = 0;
		mvex[43] = 1;
		mvex[44] = 0;
		mvex[45] = 0;
		mvex[46] = 14;
		mvex[47] = 16;
		mvex[48] = 0;
		mvex[49] = 0;
		mvex[50] = 0;
		mvex[51] = 0;
		mvex[52] = 0;
		mvex[53] = 1;
		mvex[54] = 0;
		mvex[55] = 0;
		mvex[56] = 0;
		mvex[57] = 0;
		mvex[58] = 0;
		mvex[59] = 32;
		mvex[60] = 116;
		mvex[61] = 114;
		mvex[62] = 101;
		mvex[63] = 120;
		mvex[64] = 0;
		mvex[65] = 0;
		mvex[66] = 0;
		mvex[67] = 0;
		mvex[68] = 0;
		mvex[69] = 0;
		mvex[70] = 0;
		mvex[71] = 2;
		mvex[72] = 0;
		mvex[73] = 0;
		mvex[74] = 0;
		mvex[75] = 1;
		mvex[76] = 0;
		mvex[77] = 0;
		mvex[78] = 4;
		mvex[79] = 0;
		mvex[80] = 0;
		mvex[81] = 0;
		mvex[82] = 0;
		mvex[83] = 0;
		mvex[84] = 2;
		mvex[85] = 0;
		mvex[86] = 0;
		mvex[87] = 0;
		mvex[88] = 0;
		mvex[89] = 0;
		mvex[90] = 0;
		mvex[91] = 16;
		mvex[92] = 116;
		mvex[93] = 114;
		mvex[94] = 101;
		mvex[95] = 112;
		mvex[96] = 0;
		mvex[97] = 0;
		mvex[98] = 0;
		mvex[99] = 0;
		mvex[100] = 0;
		mvex[101] = 0;
		mvex[102] = 0;
		mvex[103] = 1;
		mvex[104] = 0;
		mvex[105] = 0;
		mvex[106] = 0;
		mvex[107] = 16;
		mvex[108] = 116;
		mvex[109] = 114;
		mvex[110] = 101;
		mvex[111] = 112;
		mvex[112] = 0;
		mvex[113] = 0;
		mvex[114] = 0;
		mvex[115] = 0;
		mvex[116] = 0;
		mvex[117] = 0;
		mvex[118] = 0;
		mvex[119] = 2;
		
		
		//соберём trac аудио
		stsdA[0] = 0;
		stsdA[1] = 0;
		stsdA[2] = 0;
		stsdA[3] = 94;
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
		stsdA[19] = 78;
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
		stsdA[48] = 172;
		stsdA[49] = 68;
		stsdA[50] = 0;
		stsdA[51] = 0;
		stsdA[52] = 0;
		stsdA[53] = 0;
		stsdA[54] = 0;
		stsdA[55] = 42;
		stsdA[56] = 101;
		stsdA[57] = 115;
		stsdA[58] = 100;
		stsdA[59] = 115;
		stsdA[60] = 0;
		stsdA[61] = 0;
		stsdA[62] = 0;
		stsdA[63] = 0;
		stsdA[64] = 3;
		stsdA[65] = 28;
		stsdA[66] = 0;
		stsdA[67] = 2;
		stsdA[68] = 0;
		stsdA[69] = 4;
		stsdA[70] = 20;
		stsdA[71] = 64;
		stsdA[72] = 21;
		stsdA[73] = 0;
		stsdA[74] = 0;
		stsdA[75] = 0;
		stsdA[76] = 0;
		stsdA[77] = 2;
		stsdA[78] = 5;
		stsdA[79] = 66;
		stsdA[80] = 0;
		stsdA[81] = 2;
		stsdA[82] = 5;
		stsdA[83] = 66;
		stsdA[84] = 5;
		stsdA[85] = 5;
		stsdA[86] = 18;
		stsdA[87] = 16;
		stsdA[88] = 86;
		stsdA[89] = 229;
		stsdA[90] = 0;
		stsdA[91] = 6;
		stsdA[92] = 1;
		stsdA[93] = 2;

		
		sttsA[0] = 0;//размер атома
		sttsA[1] = 0;//размер атома
		sttsA[2] = 0;//размер атома
		sttsA[3] = 16;//размер атома
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
		sttsA[15] = 0;//количество записей
		
		stscA[0] = 0;//размер атома
		stscA[1] = 0;//размер атома
		stscA[2] = 0;//размер атома
		stscA[3] = 16;//размер атома
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
		stscA[15] = 0;//количество записей
		
		stszA[0] = 0;//размер атома
		stszA[1] = 0;  //размер атома
		stszA[2] = 0;     //размер атома
		stszA[3] = 20;              //размер атома
		stszA[4] = 115;//s
		stszA[5] = 116;//t
		stszA[6] = 115;//s
		stszA[7] = 122;//z
		stszA[8] = 0;//версия
		stszA[9] = 0;//версия
		stszA[10] = 0;//версия
		stszA[11] = 0;//версия
		stszA[12] = 0;//флаг
		stszA[13] = 0;//флаг
		stszA[14] = 0;//флаг
		stszA[15] = 0;//флаг
		stszA[16] = 0;//количество sample'ов
		stszA[17] = 0;  //количество sample'ов
		stszA[18] = 0;     //количество sample'ов
		stszA[19] = 0;              //количество sample'ов
		
		stcoA[0] = 0;//размер атома
		stcoA[1] = 0;  //размер атома
		stcoA[2] = 0;     //размер атома
		stcoA[3] = 16;              //размер атома
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
		stcoA[15] = 0;//число кусков
		
		//соберём stbl
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
		dinfA[8] = 0;
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
		mdhdA[20] = 0;//time scale 44100
		mdhdA[21] = 0;//time scale 44100
		mdhdA[22] = 172;//time scale 44100
		mdhdA[23] = 68;//time scale 44100
		mdhdA[24] = 0;
		mdhdA[25] = 0;
		mdhdA[26] = 0;
		mdhdA[27] = 0;
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
		elstA[16] = 0;//?
		elstA[17] = 0;//?
		elstA[18] = 0;//?
		elstA[19] = 0;//?
		elstA[20] = 0;//0
		elstA[21] = 0;//0
		elstA[22] = 4;//0
		elstA[23] = 0;//0
		elstA[24] = 0;
		elstA[25] = 1;
		elstA[26] = 0;
		elstA[27] = 0;

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
		tkhdA[11] = 3;//флаги
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
		tkhdA[23] = 2;//track ID
		tkhdA[24] = 0;//зарезервировано
		tkhdA[25] = 0;//зарезервировано
		tkhdA[26] = 0;//зарезервировано
		tkhdA[27] = 0;//зарезервировано
		tkhdA[28] = 0;//длительность аудио
		tkhdA[29] = 0;//длительность аудио
		tkhdA[30] = 0;//длительность аудио
		tkhdA[31] = 0;//длительность аудио
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
		tkhdA[44] = 1;//громкость 0.0
		tkhdA[45] = 0;//громкость 0.0
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
		mvhd[24] = 0;//длительность
		mvhd[25] = 0;//длительность
		mvhd[26] = 0;//длительность
		mvhd[27] = 0;//длительность
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
		var moovLength = 8 + mvhd.length + mvex.length + trakA.length + trakV.length;
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
		moov.set(mvex, 8 + mvhd.length);
		moov.set(trakV, 8 + mvhd.length + mvex.length);
		moov.set(trakA, 8 + mvhd.length + mvex.length + trakV.length);
		mp4.set(moov, mp4CurrentSize);
		mp4CurrentSize += moov.length;
		
		initSize = mp4CurrentSize;
	}
	else
	{
		initSize = 0;
	}
	
	////////////////далее блок подгружаемых данных
	
	var sidx = new Array();
	var moof = new Array();
	var mdat = new Array();
	
	var mfhd = new Array();
	
	var trunV = new Array();
	var tfdtV = new Array();
	var tfhdV = new Array();
	var trafV = new Array();
	
	var trunA = new Array();
	var tfdtA = new Array();
	var tfhdA = new Array();
	var trafA = new Array();
	
	
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
	
	
	sidx[0] = 0;
	sidx[1] = 0;
	sidx[2] = 0;
	sidx[3] = 44;
	sidx[4] = 115;
	sidx[5] = 105;
	sidx[6] = 100;
	sidx[7] = 120;
	sidx[8] = 0;
	sidx[9] = 0;
	sidx[10] = 0;
	sidx[11] = 0;
	sidx[12] = 0;
	sidx[13] = 0;
	sidx[14] = 0;
	sidx[15] = 1;
	sidx[16] = 0;
	sidx[17] = 1;
	sidx[18] = 95;
	sidx[19] = 144;
	sidx[20] = ((ch * 4 * 90000) & 0xFF000000) >> 24;//Earliest presentation time 
	sidx[21] = ((ch * 4 * 90000) & 0xFF0000) >> 16;//Earliest presentation time
	sidx[22] = ((ch * 4 * 90000) & 0xFF00) >> 8;//Earliest presentation time
	sidx[23] = (ch * 4 * 90000) & 0xFF;  //Earliest presentation time
	sidx[24] = 0;
	sidx[25] = 0;
	sidx[26] = 0;
	sidx[27] = 0;
	sidx[28] = 0;
	sidx[29] = 0;
	sidx[30] = 0;
	sidx[31] = 1;
	sidx[32] = 0;//размер mdat и moof
	sidx[33] = 0;//размер mdat и moof
	sidx[34] = 0;//размер mdat и moof
	sidx[35] = 0;//размер mdat и moof
	sidx[36] = 0;
	sidx[37] = 5;
	sidx[38] = 126;
	sidx[39] = 64;
	sidx[40] = 144;
	sidx[41] = 0;
	sidx[42] = 0;
	sidx[43] = 0;
	mp4.set(sidx, mp4CurrentSize);
	mp4CurrentSize += sidx.length;
	
	var mdatIndex = mp4CurrentSize;
	

		
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
		}	
	}
	sampleCountV = sizeSamplesV.length;		
			
			
	
	//отсортируем PTS
	PTSsASort.sort(CompareNumeric);
	//отсортируем PTS
	PTSsVSort.sort(CompareNumeric);
	
	
		
	
	
	mfhd[0] = 0;
	mfhd[1] = 0;
	mfhd[2] = 0;
	mfhd[3] = 16;
	mfhd[4] = 109;
	mfhd[5] = 102;
	mfhd[6] = 104;
	mfhd[7] = 100;
	mfhd[8] = 0;
	mfhd[9] = 0;
	mfhd[10] = 0;
	mfhd[11] = 0;
	mfhd[12] = ((ch + 1) & 0xFF000000) >> 24;//Sequence number
	mfhd[13] = ((ch + 1) & 0xFF0000) >> 16;//Sequence number
	mfhd[14] = ((ch + 1) & 0xFF00) >> 8;//Sequence number  
	mfhd[15] = (ch + 1) & 0xFF;  // Sequence number

	
	//видео
	tfhdV[0] = 0;
	tfhdV[1] = 0;
	tfhdV[2] = 0;
	tfhdV[3] = 16;
	tfhdV[4] = 116;
	tfhdV[5] = 102;
	tfhdV[6] = 104;
	tfhdV[7] = 100;
	tfhdV[8] = 0;//512
	tfhdV[9] = 2;//512
	tfhdV[10] = 0;//512
	tfhdV[11] = 0;//512
	tfhdV[12] = 0;//id
	tfhdV[13] = 0;//id
	tfhdV[14] = 0;//id
	tfhdV[15] = 1;//id
	
	tfdtV[0] = 0;
	tfdtV[1] = 0;
	tfdtV[2] = 0;
	tfdtV[3] = 16;
	tfdtV[4] = 116;
	tfdtV[5] = 102;
	tfdtV[6] = 100;
	tfdtV[7] = 116;
	tfdtV[8] = 0;
	tfdtV[9] = 0;
	tfdtV[10] = 0;
	tfdtV[11] = 0;
	tfdtV[12] = ((ch * 4 * 90000) & 0xFF000000) >> 24;//Base media decode time
	tfdtV[13] = ((ch * 4 * 90000) & 0xFF0000) >> 16;//Base media decode time
	tfdtV[14] = ((ch * 4 * 90000) & 0xFF00) >> 8;//Base media decode time
	tfdtV[15] = (ch * 4 * 90000) & 0xFF; //Base media decode time
	
	var stszSizeV = 20 + sampleCountV * 12;
	trunV[0] = (stszSizeV & 0xFF000000) >> 24;//размер атома
	trunV[1] = (stszSizeV & 0xFF0000) >> 16;  //размер атома
	trunV[2] = (stszSizeV & 0xFF00) >> 8;     //размер атома
	trunV[3] = stszSizeV & 0xFF;              //размер атома
	trunV[4] = 116;//t
	trunV[5] = 114;//r
	trunV[6] = 117;//u
	trunV[7] = 110;//n
	trunV[8] = 0;//PTS[1] - PTS[0]
	trunV[9] = 0;//PTS[1] - PTS[0]
	trunV[10] = 14;//PTS[1] - PTS[0]
	trunV[11] = 1;//PTS[1] - PTS[0]
	trunV[12] = (sampleCountV & 0xFF000000) >> 24;//количество sample'ов
	trunV[13] = (sampleCountV & 0xFF0000) >> 16;  //количество sample'ов
	trunV[14] = (sampleCountV & 0xFF00) >> 8;     //количество sample'ов
	trunV[15] = sampleCountV & 0xFF;              //количество sample'ов
	trunV[16] = ((8 + 144 + sampleCountV * 12 + sampleCountA * 8 + audioLength) & 0xFF000000) >> 24;//ссылка на mdat
	trunV[17] = ((8 + 144 + sampleCountV * 12 + sampleCountA * 8 + audioLength) & 0xFF0000) >> 16;  //ссылка на mdat
	trunV[18] = ((8 + 144 + sampleCountV * 12 + sampleCountA * 8 + audioLength) & 0xFF00) >> 8;     //ссылка на mdat
	trunV[19] = (8 + 144 + sampleCountV * 12 + sampleCountA * 8 + audioLength) & 0xFF;              //ссылка на mdat
	for (j = 0; j < sizeSamplesV.length; j++)
	{
		trunV[20 + j * 12] = (sizeSamplesV[j] & 0xFF000000) >> 24;    //размер sample'а
		trunV[20 + j * 12 + 1] = (sizeSamplesV[j] & 0xFF0000) >> 16;  //размер sample'а
		trunV[20 + j * 12 + 2] = (sizeSamplesV[j] & 0xFF00) >> 8;     //размер sample'а
		trunV[20 + j * 12 + 3] = sizeSamplesV[j] & 0xFF;              //размер sample'а
		
		trunV[20 + j * 12 + 4] = (65536 & 0xFF000000) >> 24;    //
		trunV[20 + j * 12 + 5] = (65536 & 0xFF0000) >> 16;  //
		trunV[20 + j * 12 + 6] = (65536 & 0xFF00) >> 8;     //
		trunV[20 + j * 12 + 7] =  65536 & 0xFF;              //
		
		if (DTSsV[j] != 0)
		{
			trunV[20 + j * 12 + 8] = ((PTSsV[j] - DTSsV[j]) & 0xFF000000) >> 24;    //PTS - DTS
			trunV[20 + j * 12 + 9] = ((PTSsV[j] - DTSsV[j]) & 0xFF0000) >> 16;  //PTS - DTS
			trunV[20 + j * 12 + 10] = ((PTSsV[j] - DTSsV[j]) & 0xFF00) >> 8;     //PTS - DTS
			trunV[20 + j * 12 + 11] = (PTSsV[j] - DTSsV[j]) & 0xFF;              //PTS - DTS
		}
		else
		{
			trunV[20 + j * 12 + 8] = 0;    //PTS - DTS
			trunV[20 + j * 12 + 9] = 0;  //PTS - DTS
			trunV[20 + j * 12 + 10] = 0;     //PTS - DTS
			trunV[20 + j * 12 + 11] = 0;              //PTS - DTS
		}
	}
	
	//соберём trafV
	var trafVLength = 8 + tfhdV.length + tfdtV.length + trunV.length;
	trafV = new Uint8Array(trafVLength);
	trafV[0] = (trafVLength & 0xFF000000) >> 24;//размер атома
	trafV[1] = (trafVLength & 0xFF0000) >> 16;//размер атома
	trafV[2] = (trafVLength & 0xFF00) >> 8;//размер атома
	trafV[3] = trafVLength & 0xFF;//размер атома
	trafV[4] = 116;//t
	trafV[5] = 114;//r
	trafV[6] = 97;//a
	trafV[7] = 102;//f
	trafV.set(tfhdV, 8);
	trafV.set(tfdtV, 8 + tfhdV.length);
	trafV.set(trunV, 8 + tfhdV.length + tfdtV.length);

	
	
	//аудио
	tfhdA[0] = 0;
	tfhdA[1] = 0;
	tfhdA[2] = 0;
	tfhdA[3] = 16;
	tfhdA[4] = 116;
	tfhdA[5] = 102;
	tfhdA[6] = 104;
	tfhdA[7] = 100;
	tfhdA[8] = 0;//512
	tfhdA[9] = 2;//512
	tfhdA[10] = 0;//512
	tfhdA[11] = 0;//512
	tfhdA[12] = 0;//id
	tfhdA[13] = 0;//id
	tfhdA[14] = 0;//id
	tfhdA[15] = 2;//id
	
	tfdtA[0] = 0;
	tfdtA[1] = 0;
	tfdtA[2] = 0;
	tfdtA[3] = 16;
	tfdtA[4] = 116;
	tfdtA[5] = 102;
	tfdtA[6] = 100;
	tfdtA[7] = 116;
	tfdtA[8] = 0;
	tfdtA[9] = 0;
	tfdtA[10] = 0;
	tfdtA[11] = 0;
	tfdtA[12] = ((ch * 4 * 44100) & 0xFF000000) >> 24;//Base media decode time
	tfdtA[13] = ((ch * 4 * 44100) & 0xFF0000) >> 16;//Base media decode time
	tfdtA[14] = ((ch * 4 * 44100) & 0xFF00) >> 8;//Base media decode time
	tfdtA[15] = (ch * 4 * 44100) & 0xFF; //Base media decode time
	
	var stszSizeA = 20 + sampleCountA * 8;
	trunA[0] = (stszSizeA & 0xFF000000) >> 24;//размер атома
	trunA[1] = (stszSizeA & 0xFF0000) >> 16;  //размер атома
	trunA[2] = (stszSizeA & 0xFF00) >> 8;     //размер атома
	trunA[3] = stszSizeA & 0xFF;              //размер атома
	trunA[4] = 116;//t
	trunA[5] = 114;//r
	trunA[6] = 117;//u
	trunA[7] = 110;//n
	trunA[8] = 0;//PTS[1] - PTS[0]
	trunA[9] = 0;//PTS[1] - PTS[0]
	trunA[10] = 3;//PTS[1] - PTS[0]
	trunA[11] = 1;//PTS[1] - PTS[0]
	trunA[12] = (sampleCountA & 0xFF000000) >> 24;//количество sample'ов
	trunA[13] = (sampleCountA & 0xFF0000) >> 16;  //количество sample'ов
	trunA[14] = (sampleCountA & 0xFF00) >> 8;     //количество sample'ов
	trunA[15] = sampleCountA & 0xFF;              //количество sample'ов
	trunA[16] = ((8 + 144 + sampleCountV * 12 + sampleCountA * 8) & 0xFF000000) >> 24;//ссылка на mdat
	trunA[17] = ((8 + 144 + sampleCountV * 12 + sampleCountA * 8) & 0xFF0000) >> 16;  //ссылка на mdat
	trunA[18] = ((8 + 144 + sampleCountV * 12 + sampleCountA * 8) & 0xFF00) >> 8;     //ссылка на mdat
	trunA[19] = (8 + 144 + sampleCountV * 12 + sampleCountA * 8) & 0xFF;              //ссылка на mdat
	for (j = 0; j < sizeSamplesA.length; j++)
	{
		trunA[20 + j * 8] = (1024 & 0xFF000000) >> 24;    //duration
		trunA[20 + j * 8 + 1] = (1024 & 0xFF0000) >> 16;  //duration
		trunA[20 + j * 8 + 2] = (1024 & 0xFF00) >> 8;     //duration
		trunA[20 + j * 8 + 3] = 1024 & 0xFF;              //duration
		
		trunA[20 + j * 8 + 4] = (sizeSamplesA[j] & 0xFF000000) >> 24;    //size
		trunA[20 + j * 8 + 5] = (sizeSamplesA[j] & 0xFF0000) >> 16;  //size
		trunA[20 + j * 8 + 6] = (sizeSamplesA[j] & 0xFF00) >> 8;     //size
		trunA[20 + j * 8 + 7] = sizeSamplesA[j] & 0xFF;              //size
	}
	
	//соберём trafA
	var trafALength = 8 + tfhdA.length + tfdtA.length + trunA.length;
	trafA = new Uint8Array(trafALength);
	trafA[0] = (trafALength & 0xFF000000) >> 24;//размер атома
	trafA[1] = (trafALength & 0xFF0000) >> 16;//размер атома
	trafA[2] = (trafALength & 0xFF00) >> 8;//размер атома
	trafA[3] = trafALength & 0xFF;//размер атома
	trafA[4] = 116;//t
	trafA[5] = 114;//r
	trafA[6] = 97;//a
	trafA[7] = 102;//f
	trafA.set(tfhdA, 8);
	trafA.set(tfdtA, 8 + tfhdA.length);
	trafA.set(trunA, 8 + tfhdA.length + tfdtA.length);
	
	
	//соберём moof
	var moofLength = 8 + mfhd.length + trafV.length + trafA.length;
	moof = new Uint8Array(moofLength);
	moof[0] = (moofLength & 0xFF000000) >> 24;//размер атома
	moof[1] = (moofLength & 0xFF0000) >> 16;//размер атома
	moof[2] = (moofLength & 0xFF00) >> 8;//размер атома
	moof[3] = moofLength & 0xFF;//размер атома
	moof[4] = 109;//m
	moof[5] = 111;//o
	moof[6] = 111;//o
	moof[7] = 102;//f
	moof.set(mfhd, 8);
	moof.set(trafV, 8 + mfhd.length);
	moof.set(trafA, 8 + mfhd.length + trafV.length);
	
	
	
	
	
	
	
	//соберём mp4
	mp4.set(moof, mp4CurrentSize);
	mp4CurrentSize += moof.length;
	
	
	//подправим sidx
	mp4[mdatIndex - 12] = (videoLength + audioLength + 8 + moof.length & 0xFF000000) >> 24;//размер атома
	mp4[mdatIndex - 11] = (videoLength + audioLength + 8 + moof.length & 0xFF0000) >> 16;//размер атома
	mp4[mdatIndex - 10] = (videoLength + audioLength + 8 + moof.length & 0xFF00) >> 8;//размер атома
	mp4[mdatIndex - 9] = videoLength + audioLength + 8 + moof.length & 0xFF;//размер атома
	
	
	
	
	//добавим mdat
	var mdatIndex2 = mp4CurrentSize;
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
	var j = 0;
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
			

	//подготовим видео (запишем размеры sample'ов)
	j = 0;
	var sampleIndexOld = 0;//предыдущий индекс семпла
	PTSDTSIndex = 0;//позиция в PTS и DTS
	while (j + 5 < streams[indexVideo].Index)
	{
		if (streams[indexVideo].Data[j] == 0 &&
			streams[indexVideo].Data[j + 1] == 0 &&
			streams[indexVideo].Data[j + 2] == 0 &&
			streams[indexVideo].Data[j + 3] == 2 &&
			streams[indexVideo].Data[j + 4] == 9 &&
			streams[indexVideo].Data[j + 5] == 240)
		{
			//длина sample
			var lengthSample = j - sampleIndexOld;
	
			if (lengthSample != 0)
			{
				if(PTSsV[PTSDTSIndex] > DTSsV[PTSDTSIndex])
				{
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
			//добавим в контейнер видео
			var videoMP4 = new Array();
			videoMP4 = streams[indexVideo].Data.subarray(sampleIndexOld, j);
			mp4.set(videoMP4, mp4CurrentSize);
			mp4CurrentSize += videoMP4.length;
		}	
	}	
			
			
	//скорректируем размер mdat
	mp4[mdatIndex2] = ((audioLength + videoLength + 8) & 0xFF000000) >> 24;
	mp4[mdatIndex2 + 1] = ((audioLength + videoLength + 8) & 0xFF0000) >> 16;
	mp4[mdatIndex2 + 2] = ((audioLength + videoLength + 8) & 0xFF00) >> 8;
	mp4[mdatIndex2 + 3] = (audioLength + videoLength + 8) & 0xFF;
	
	blokSize = mp4CurrentSize;
	
	
	if(one == true)
	{
		one = false;
		mediaSource = new window.MediaSource();
		videoElement = document.getElementById('videoplayer');				
		var url = URL.createObjectURL(mediaSource);
		videoElement.pause();
		videoElement.src = url;

		mediaSource.addEventListener('sourceopen', function (e) 
		{
			//videoSource = mediaSource.addSourceBuffer('video/mp4;codecs=mp4a.40.2,avc3.4d401f');//big bunny
			videoSource = mediaSource.addSourceBuffer('video/mp4;');//IE
			//videoSource = mediaSource.addSourceBuffer('video/mp4;codecs=mp4a.40.2,avc3.4d401e');//TAJ
			//videoSource = mediaSource.addSourceBuffer('video/mp4;codecs=avc3.640028,mp4a.40.2');//skate

			//AddSegment();
			setTimeout(Play,2000);
		},false);
	}
	else
	{
		setTimeout(Play,2000);
	}
	
	ch++;
	
	
	var DT1 = new Date();
	//alert("Время обработки: " + (DT1 - DT0) + " мс");
	
	//вывод на экран времени обработки одного кадра
	var size = 0;
	var v = 0;
	
	var newElem=document.createElement("table");
	var newRow=newElem.insertRow(0);
	
	var newCell = newRow.insertCell(0);
	newCell.width="250";
	newCell.innerHTML="";
	
	var newCell = newRow.insertCell(1);
	newCell.width="200";
	newCell.innerHTML="";
	
	var newCell = newRow.insertCell(2);
	newCell.width="200";
	newCell.innerHTML="";
	
	var newCell = newRow.insertCell(3);
	newCell.width="250";
	newCell.innerHTML="<b>" + Math.round((DT1 - DT0)*1000/4000/25*10)/10 + " мс на кадр</b>";
	
	document.body.appendChild(newElem);
	
	/*if(one == true)
	{
		one = false;
		SetBuffer();
	}*/
	
	//отладочный код создания файла чистого потока и скачивания этого файла браузером (работает безотказно в опере)
	/*var ddd = new Uint8Array(mp4CurrentSize);
	for (var i = 0; i < ddd.length; i++)
	{
		ddd[i] = mp4[i];
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
        saveData(ddd, "yyy.mp4");*/
}

//функция для сортировки
function CompareNumeric(a, b) 
{
  if (a > b) return 1;
  if (a < b) return -1;
}

function SetBuffer()
{
	if(nextTS == false)
	{
		if(currentBuffer == 1)
		{
			mp4Buffer1 = new Uint8Array(mp4CurrentSize);
			for (var i = 0; i < mp4Buffer1.length; i++)
			{
				mp4Buffer1[i] = mp4[i];
			}	
			
			var blob = new Blob([mp4Buffer1], {type: "application/octet-stream"}),
			url = window.URL.createObjectURL(blob);

			document.getElementById('videoplayer').setAttribute('src', url);
			document.getElementById('videoplayer').load();
			document.getElementById('videoplayer').play();

			document.getElementById('videoplayer').addEventListener('ended', VideoFinishes, false);

			currentBuffer = 2;
		}
		else
		{
			mp4Buffer2 = new Uint8Array(mp4CurrentSize);
			for (var i = 0; i < mp4Buffer2.length; i++)
			{
				mp4Buffer2[i] = mp4[i];
			}	
			var blob = new Blob([mp4Buffer2], {type: "application/octet-stream"}),
			url = window.URL.createObjectURL(blob);

			document.getElementById('videoplayer').setAttribute('src', url);
			document.getElementById('videoplayer').load();
			document.getElementById('videoplayer').play();

			document.getElementById('videoplayer').addEventListener('ended', VideoFinishes, false);
			
			currentBuffer = 1;
		}
	}
	nextTS = true;
}


//функция для отслеживая окончания видео
function VideoFinishes(e)
{
	SetBuffer();
}

function Play()
{
	
	AddSegment();
	//setTimeout(Play,2000);
}

function AddSegment() 
{
	//skate
	if(indexSegment == 0)
	{
		var temp1 = new Array();
		temp1 = mp4.subarray(0, initSize);//0-1371
		videoSource.appendBuffer(temp1);
		setTimeout(Play,2000);
	}
	if(indexSegment == 1)
	{
		var temp1 = new Array();
		temp1 = mp4.subarray(initSize, blokSize);//1371-3002229
		videoSource.appendBuffer(temp1);
		nextTS = true;
		indexSegment = 0;
	}

	indexSegment++;
}