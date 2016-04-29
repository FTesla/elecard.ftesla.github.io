function PacketTS(FlagError, FlagBeginData, FlagPriority, PID, Scramble, PointerData, Ch, Data)
{
	this.FlagError = FlagError;
    this.FlagBeginData = FlagBeginData;
    this.FlagPriority = FlagPriority;

	this.PID = PID;

	this.Scramble = Scramble;
    this.PointerData = PointerData;
    this.Ch = Ch;

	this.Data = Data;
}

function ExtractStream(fileByte)
{
	//для отсчёта времени
	var DT0 = new Date();

	//получим список PID'ов
	var PIDs = new Array();

	//вытащим TS пакеты
	pTSs = new Array();
	var indexPacketTS = 0;
	for (var i = 0; i < fileByte.length / 188; i++)
	{	
		//данные одного пакета
		var flagError = 0;
		var flagBeginData = 0;
		var flagPriority = 0;
		var PID = 0;
		var scramble = 0;
		var pointerData = 0;
		var ch = 0;
		var data = [];

		var bit_0_7 = fileByte[i * 188 + 2]; 
		var bit_8_15 = (fileByte[i * 188 + 1]).toString(2);

		//найдём PID
		PID = bit_0_7;//8 битов 
		PID += (bit_8_15 % 10) * 256;//9 бит
		bit_8_15 = Math.floor(bit_8_15 / 10);
		PID += (bit_8_15 % 10) * 512;//10 бит
		bit_8_15 = Math.floor(bit_8_15 / 10);
		PID += (bit_8_15 % 10) * 1024;//11 бит
		bit_8_15 = Math.floor(bit_8_15 / 10);
		PID += (bit_8_15 % 10) * 2048;//12 бит
		bit_8_15 = Math.floor(bit_8_15 / 10);
		PID += (bit_8_15 % 10) * 4096;//13 бит

		//найдём flagPriority
		bit_8_15 = Math.floor(bit_8_15 / 10);
		flagPriority += (bit_8_15 % 10);//14 бит

		//найдём flagBeginData
		bit_8_15 = Math.floor(bit_8_15 / 10);
		flagBeginData += (bit_8_15 % 10);//15 бит

		//найдём flagError
		bit_8_15 = Math.floor(bit_8_15 / 10);
		flagError += (bit_8_15 % 10);//16 бит

		//найдём счётчик
		var byte4 = (fileByte[i * 188 + 3]).toString(2);
		ch += (byte4 % 10);//1 бит
		byte4 = Math.floor(byte4 / 10);
		ch += (byte4 % 10) * 2;//2 бит
		byte4 = Math.floor(byte4 / 10);
		ch += (byte4 % 10) * 4;//3 бит
		byte4 = Math.floor(byte4 / 10);
		ch += (byte4 % 10) * 8;//4 бит
		byte4 = Math.floor(byte4 / 10);

		//найдём pointerData
		pointerData += (byte4 % 10);
		byte4 = Math.floor(byte4 / 10);
		pointerData += (byte4 % 10) * 2;
		byte4 = Math.floor(byte4 / 10);

		//найдём scramble
		scramble += (byte4 % 10);
		byte4 = Math.floor(byte4 / 10);
		scramble += (byte4 % 10) * 2;
		byte4 = Math.floor(byte4 / 10);

		//уберём поле адаптации, если стоит флаг 3
		if(pointerData == 3)
		{
			var l = fileByte[i * 188 + 4];//длина поля адаптации
			if (184 >= (1 + l))
			{
				data = fileByte.subarray(i * 188 + 4 + 1 + l, i * 188 + 188);
			}
		}
		if(pointerData == 1)
		{
			//занесём "полезные" данные
			data = fileByte.subarray(i * 188 + 4, i * 188 + 188);
		}

		//найдём все PID'ы
		var PIDon = false;//есть ли PID в списке
		for (var j = 0; j < PIDs.length; j++)
		{
			if (PIDs[j] == PID)
			{
				PIDon = true;
			}
		}
		if(PIDon == false)
		{
			PIDs[PIDs.length] = PID;
		}
		pTSs[indexPacketTS] = new PacketTS(flagError, flagBeginData, flagPriority, PID, scramble, pointerData, ch, data);
		indexPacketTS++;
	}

	var DT1 = new Date();
	//alert((DT1 - DT0) + " мс");
}

