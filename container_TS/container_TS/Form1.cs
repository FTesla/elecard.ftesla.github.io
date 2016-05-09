using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Windows.Forms;

using System.IO;
using System.Collections;

namespace container_TS
{
    public partial class Form1 : Form
    {
        public Form1()
        {
            InitializeComponent();
        }

        private void button1_Click(object sender, EventArgs e)
        {
            //диалог для открытия файла
            OpenFileDialog openFileDialog = new OpenFileDialog();
            openFileDialog.Filter = "TS files (*.txt)|*.ts|All files (*.*)|*.*";

            //если выбран файл и нажато OK
            if (openFileDialog.ShowDialog() == DialogResult.OK)
            {
                //для подсчёта времени выполнения кода
                long DT0 = DateTime.Now.Ticks;
                long DT1 = 0;

                //хранит TS пакеты
                List<PacketTS> pTSs = new List<PacketTS>();

                //массив для хранения файла
                byte[] fileByte;
                //откроем файл
                fileByte = File.ReadAllBytes(openFileDialog.FileName);

                //пройдём по всем байтам, выделим из них пакеты TS и разберём их
                for (int i = 0; i < fileByte.Length / 188; i++)
                {
                    //текущий TS пакет
                    PacketTS pTS = new PacketTS();

                    //временные переменные
                    string str0 = "";
                    string str1 = "";
                    string str2 = "";
                    string str3 = "";

                    //синхробайт7
                    str0 = Convert.ToString(fileByte[i * 188], 16);

                    //3 флага
                    str1 = Convert.ToString(fileByte[i * 188 + 1], 2);
                    while (str1.Length < 8) str1 = "0" + str1;
                    //запишем флаги: ошибки, начало структурной единицы, приоритета
                    pTS.FlagError = Convert.ToInt32(str1[0]) - 48;
                    pTS.FlagBeginData = Convert.ToInt32(str1[1]) - 48;
                    pTS.FlagPriority = Convert.ToInt32(str1[2]) - 48;

                    //PID
                    str2 = Convert.ToString(fileByte[i * 188 + 2], 2);
                    while (str2.Length < 8) str2 = "0" + str2;
                    pTS.PID = (Convert.ToInt32(str1[3]) - 48) * 4096 + (Convert.ToInt32(str1[4]) - 48) * 2048 + (Convert.ToInt32(str1[5]) - 48) * 1024 + (Convert.ToInt32(str1[6]) - 48) * 512 + (Convert.ToInt32(str1[7]) - 48) * 256 +
                                (Convert.ToInt32(str2[0]) - 48) * 128 + (Convert.ToInt32(str2[1]) - 48) * 64 + (Convert.ToInt32(str2[2]) - 48) * 32 + (Convert.ToInt32(str2[3]) - 48) * 16 + (Convert.ToInt32(str2[4]) - 48) * 8 + (Convert.ToInt32(str2[5]) - 48) * 4 + (Convert.ToInt32(str2[6]) - 48) * 2 + (Convert.ToInt32(str2[7]) - 48);

                    //3 поля
                    str3 = Convert.ToString(fileByte[i * 188 + 3], 2);
                    while (str3.Length < 8) str3 = "0" + str3;
                    //запишем поля: скремблирования, наличия полей адаптации в нагрузке транспортного пакета, счётчика непрерывности
                    pTS.Scramble = (Convert.ToInt32(str3[0]) - 48) * 2 + (Convert.ToInt32(str3[1]) - 48);
                    pTS.PointerData = (Convert.ToInt32(str3[2]) - 48) * 2 + (Convert.ToInt32(str3[3]) - 48);
                    pTS.ch = (Convert.ToInt32(str3[4]) - 48) * 8 + (Convert.ToInt32(str3[5]) - 48) * 4 + (Convert.ToInt32(str3[6]) - 48) * 2 + (Convert.ToInt32(str3[7]) - 48);

                    if (pTS.PointerData == 0)
                    {
                        i++;
                    }

                    //уберём поле адаптации, если стоит флаг 3
                    if (pTS.PointerData == 3)
                    {
                        int l = fileByte[i * 188 + 4];//длина поля адаптации
                        if (184 >= (1 + l))
                        {
                            Array.Resize(ref pTS.data, 184 - (1 + l));
                            Array.Copy(fileByte, i * 188 + 4 + (1 + l), pTS.data, 0, 184 - (1 + l));
                        }
                    }
                    if(pTS.PointerData == 1)
                    {
                        //занесём "полезные" данные
                        Array.Resize(ref pTS.data, 184);
                        Array.Copy(fileByte, i * 188 + 4, pTS.data, 0, 184);
                    }

                    //добавим текущий пакет в массив пакетов
                    pTSs.Add(pTS);
                }

                //найдём все PID'ы
                List<int> PIDs = new List<int>(); //список PID'ов
                for (int i = 0; i < pTSs.Count; i++)
                {
                    bool PIDon = false;//есть ли PID в списке
                    for (int j = 0; j < PIDs.Count; j++)
                    {
                        if (pTSs[i].PID == PIDs[j])
                        {
                            PIDon = true;
                        }
                    }
                    if(PIDon == false)
                    {
                        PIDs.Add(pTSs[i].PID);
                    }
                }

                //найдём streamID для аудио и видео
                List<int> streamIDs = new List<int>(); //список streamID
                for (int i = 0; i < PIDs.Count; i++)
                {
                    for (int j = 0; j < pTSs.Count; j++)
                    {
                        if(pTSs[j].PID == PIDs[i])
                        {
                            streamIDs.Add(pTSs[j].data[3]);
                            j = pTSs.Count;
                        }
                    }
                }

                //выделим все потоки и сохраним (аудио 192-223, видо 224 - 239
                for (int i = 0; i < streamIDs.Count; i++)
                {
                    //аудио
                    if (streamIDs[i] >= 192 &&
                        streamIDs[i] <=223)
                    {
                        //путь до файла сохранения
                        string filePathSaveAudio = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory) + @"\" + openFileDialog.SafeFileName + "_" + streamIDs[i] + ".mp4";
                        //File.WriteAllBytes(filePathSaveAudio, PackerMP4(ExtractStream(pTSs, PIDs[i], streamIDs[i])));
                        File.WriteAllBytes(filePathSaveAudio, PackerMP4(ExtractStream(pTSs, PIDs[i], streamIDs[i])));
                        //PackerMP4(ExtractStream(pTSs, PIDs[i], streamIDs[i]));
                    }

                    //видео
                    if (streamIDs[i] >= 224 &&
                        streamIDs[i] <= 239)
                    {
                        string filePathSaveVideo = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory) + @"\" + openFileDialog.SafeFileName + "_" + streamIDs[i] + ".raw";
                        //File.WriteAllBytes(filePathSaveVideo, ExtractStream(pTSs, PIDs[i], streamIDs[i]));
                        ExtractStream(pTSs, PIDs[i], streamIDs[i]);
                    }
                }

                DT1 = DateTime.Now.Ticks;
                //label1.Text = "Время обработки: " + ((DT1 - DT0) / 10000).ToString() + " миллисекунд";
                //this.Text = "Время обработки: " + ((DT1 - DT0) / 10000).ToString() + " миллисекунд";
            }
        }


        byte[] PackerMP4(byte[] audioClean)
        {
            //для подсчёта времени выполнения кода
            long DT0 = DateTime.Now.Ticks;
            long DT1 = 0;

            //подготовим аудио (уберём заголовки и запишем размеры sample'ов)
            int[] sizeSamples = new int[0];
            byte[] audioMP4 = new byte[0];

            int i = 0;
            int sampleCount;
            while (i + 7 < audioClean.Length)
            {
                if (audioClean[i] == 255)
                {
                    int len1 = (audioClean[i + 3] & 0x3) << 11;  //  | | | | | | |x|x|       | | | | | | | | |       | | | | | | | | |
                    int len2 = audioClean[i + 4] << 3;           //  | | | | | | | | |       |x|x|x|x|x|x|x|x|       | | | | | | | | |
                    int len3 = (audioClean[i + 5] & 0xE0) >> 5;  //  | | | | | | | | |       | | | | | | | | |       |x|x|x| | | | | |

                    //длина sample без заголовка
                    int lengthSample = len1 + len2 + len3 - 7;

                    //запишем длину в массив
                    Array.Resize(ref sizeSamples, sizeSamples.Length + 1);
                    sizeSamples[sizeSamples.Length - 1] = lengthSample;

                    //добавим sample в массив
                    Array.Resize(ref audioMP4, audioMP4.Length + lengthSample);
                    Array.Copy(audioClean, i + 7, audioMP4, audioMP4.Length - lengthSample, lengthSample);

                    i = i + lengthSample + 7;
                }
                else
                {
                    i++;
                }
            }
            sampleCount = sizeSamples.Length;

            //результат
            byte[] result = new byte[0];

            //атомы
            byte[] ftyp;
            byte[] free;
            byte[] mdat;

            byte[] moov;
            byte[] mvhd;
            byte[] trak;
            byte[] tkhd;
            byte[] edts;
            byte[] elst;
            byte[] mdia;
            byte[] hdlr;
            byte[] mdhd;
            byte[] minf;
            byte[] smhd;
            byte[] dinf;
            byte[] stbl;
            byte[] stsd;
            byte[] stts;
            byte[] stsc;
            byte[] stsz;
            byte[] stco;

            ftyp = File.ReadAllBytes("ftyp");
            free = File.ReadAllBytes("free");

            int mdatLength = audioMP4.Length + 8;
            mdat = new byte[mdatLength];
            mdat[0] = Convert.ToByte((mdatLength & 0xFF000000) >> 24);
            mdat[1] = Convert.ToByte((mdatLength & 0xFF0000) >> 16);
            mdat[2] = Convert.ToByte((mdatLength & 0xFF00) >> 8);
            mdat[3] = Convert.ToByte(mdatLength & 0xFF);
            mdat[4] = 109;//m
            mdat[5] = 100;//d
            mdat[6] = 97; //a
            mdat[7] = 116;//t
            Array.Copy(audioMP4, 0, mdat, 8, audioMP4.Length);

            stsd = File.ReadAllBytes("stsd");

            stts = new byte[24];
            stts[0] = 0;//размер атома
            stts[1] = 0;//размер атома
            stts[2] = 0;//размер атома
            stts[3] = 24;//размер атома
            stts[4] = 115;//s
            stts[5] = 116;//t
            stts[6] = 116;//t
            stts[7] = 115;//s
            stts[8] = 0;//флаг
            stts[9] = 0;//флаг
            stts[10] = 0;//флаг
            stts[11] = 0;//флаг
            stts[12] = 0;//количество записей
            stts[13] = 0;//количество записей
            stts[14] = 0;//количество записей
            stts[15] = 1;//количество записей
            stts[16] = Convert.ToByte((sampleCount & 0xFF000000) >> 24);//количество sample'ов
            stts[17] = Convert.ToByte((sampleCount & 0xFF0000) >> 16);  //количество sample'ов
            stts[18] = Convert.ToByte((sampleCount & 0xFF00) >> 8);     //количество sample'ов
            stts[19] = Convert.ToByte(sampleCount & 0xFF);              //количество sample'ов
            stts[20] = 0;//продолжительность sample
            stts[21] = 0;//продолжительность sample
            stts[22] = 4;//продолжительность sample
            stts[23] = 0;//продолжительность sample

            stsc = new byte[28];
            stsc[0] = 0;//размер атома
            stsc[1] = 0;//размер атома
            stsc[2] = 0;//размер атома
            stsc[3] = 28;//размер атома
            stsc[4] = 115;//s
            stsc[5] = 116;//t
            stsc[6] = 115;//s
            stsc[7] = 99;//c
            stsc[8] = 0;//флаг
            stsc[9] = 0;//флаг
            stsc[10] = 0;//флаг
            stsc[11] = 0;//флаг
            stsc[12] = 0;//количество записей
            stsc[13] = 0;//количество записей
            stsc[14] = 0;//количество записей
            stsc[15] = 1;//количество записей
            stsc[16] = 0;//первый кусок
            stsc[17] = 0;//первый кусок
            stsc[18] = 0;//первый кусок
            stsc[19] = 1;//первый кусок
            stsc[20] = Convert.ToByte((sampleCount & 0xFF000000) >> 24);//количество sample'ов в куске
            stsc[21] = Convert.ToByte((sampleCount & 0xFF0000) >> 16);  //количество sample'ов в куске
            stsc[22] = Convert.ToByte((sampleCount & 0xFF00) >> 8);     //количество sample'ов в куске
            stsc[23] = Convert.ToByte(sampleCount & 0xFF);              //количество sample'ов в куске
            stsc[24] = 0;//ID sample
            stsc[25] = 0;//ID sample
            stsc[26] = 0;//ID sample
            stsc[27] = 1;//ID sample

            int stszSize = 20 + sampleCount * 4;
            stsz = new byte[stszSize];
            stsz[0] = Convert.ToByte((stszSize & 0xFF000000) >> 24);//размер атома
            stsz[1] = Convert.ToByte((stszSize & 0xFF0000) >> 16);  //размер атома
            stsz[2] = Convert.ToByte((stszSize & 0xFF00) >> 8);     //размер атома
            stsz[3] = Convert.ToByte(stszSize & 0xFF);              //размер атома
            stsz[4] = 115;//s
            stsz[5] = 116;//t
            stsz[6] = 115;//s
            stsz[7] = 122;//z
            stsz[8] = 0;//версия
            stsz[9] = 0;//версия
            stsz[10] = 0;//версия
            stsz[11] = 0;//версия
            stsz[12] = 0;//флаг
            stsz[13] = 0;//флаг
            stsz[14] = 0;//флаг
            stsz[15] = 0;//флаг
            stsz[16] = Convert.ToByte((sampleCount & 0xFF000000) >> 24);//количество sample'ов
            stsz[17] = Convert.ToByte((sampleCount & 0xFF0000) >> 16);  //количество sample'ов
            stsz[18] = Convert.ToByte((sampleCount & 0xFF00) >> 8);     //количество sample'ов
            stsz[19] = Convert.ToByte(sampleCount & 0xFF);              //количество sample'ов
            for (i = 0; i < sizeSamples.Length; i++)
            {
                stsz[20 + i * 4] = Convert.ToByte((sizeSamples[i] & 0xFF000000) >> 24);    //размер sample'а
                stsz[20 + i * 4 + 1] = Convert.ToByte((sizeSamples[i] & 0xFF0000) >> 16);  //размер sample'а
                stsz[20 + i * 4 + 2] = Convert.ToByte((sizeSamples[i] & 0xFF00) >> 8);     //размер sample'а
                stsz[20 + i * 4 + 3] = Convert.ToByte(sizeSamples[i] & 0xFF);              //размер sample'а
            }

            stco = new byte[20];
            stco[0] = Convert.ToByte((stco.Length & 0xFF000000) >> 24);//размер атома
            stco[1] = Convert.ToByte((stco.Length & 0xFF0000) >> 16);  //размер атома
            stco[2] = Convert.ToByte((stco.Length & 0xFF00) >> 8);     //размер атома
            stco[3] = Convert.ToByte(stco.Length & 0xFF);              //размер атома
            stco[4] = 115;//s
            stco[5] = 116;//t
            stco[6] = 99;//c
            stco[7] = 111;//o
            stco[8] = 0;//флаг
            stco[9] = 0;//флаг
            stco[10] = 0;//флаг
            stco[11] = 0;//флаг
            stco[12] = 0;//число кусков
            stco[13] = 0;//число кусков
            stco[14] = 0;//число кусков
            stco[15] = 1;//число кусков
            stco[16] = Convert.ToByte(((ftyp.Length + free.Length + 8) & 0xFF000000) >> 24);//указатель на начало данных
            stco[17] = Convert.ToByte(((ftyp.Length + free.Length + 8) & 0xFF0000) >> 16);  //указатель на начало данных
            stco[18] = Convert.ToByte(((ftyp.Length + free.Length + 8) & 0xFF00) >> 8);     //указатель на начало данных
            stco[19] = Convert.ToByte((ftyp.Length + free.Length + 8) & 0xFF);              //указатель на начало данных

            //соберём stbl
            int stblLength = 8 + stsd.Length + stts.Length + stsc.Length + stsz.Length + stco.Length;
            stbl = new byte[stblLength];
            stbl[0] = Convert.ToByte((stblLength & 0xFF000000) >> 24);//размер атома
            stbl[1] = Convert.ToByte((stblLength & 0xFF0000) >> 16);  //размер атома
            stbl[2] = Convert.ToByte((stblLength & 0xFF00) >> 8);     //размер атома
            stbl[3] = Convert.ToByte(stblLength & 0xFF);              //размер атома
            stbl[4] = 115;//s
            stbl[5] = 116;//t
            stbl[6] = 98;//b
            stbl[7] = 108;//l
            Array.Copy(stsd, 0, stbl, 8, stsd.Length);
            Array.Copy(stts, 0, stbl, 8 + stsd.Length, stts.Length);
            Array.Copy(stsc, 0, stbl, 8 + stsd.Length + stts.Length, stsc.Length);
            Array.Copy(stsz, 0, stbl, 8 + stsd.Length + stts.Length + stsc.Length, stsz.Length);
            Array.Copy(stco, 0, stbl, 8 + stsd.Length + stts.Length + stsc.Length + stsz.Length, stco.Length);

            dinf = File.ReadAllBytes("dinf");
            smhd = File.ReadAllBytes("smhd");

            //соберём minf
            int minfLength = 8 + smhd.Length + dinf.Length + stbl.Length;
            minf = new byte[minfLength];
            minf[0] = Convert.ToByte((minfLength & 0xFF000000) >> 24);//размер атома
            minf[1] = Convert.ToByte((minfLength & 0xFF0000) >> 16);//размер атома
            minf[2] = Convert.ToByte((minfLength & 0xFF00) >> 8);//размер атома
            minf[3] = Convert.ToByte((minfLength & 0xFF));//размер атома
            minf[4] = 109;//m
            minf[5] = 105;//i
            minf[6] = 110;//n
            minf[7] = 102;//f
            Array.Copy(smhd, 0, minf, 8, smhd.Length);
            Array.Copy(dinf, 0, minf, 8 + smhd.Length, dinf.Length);
            Array.Copy(stbl, 0, minf, 8 + smhd.Length + dinf.Length, stbl.Length);

            hdlr = File.ReadAllBytes("hdlr");

            mdhd = new byte[32];
            mdhd[0] = 0;//размер атома
            mdhd[1] = 0;//размер атома
            mdhd[2] = 0;//размер атома
            mdhd[3] = 32;//размер атома
            mdhd[4] = 109;//m
            mdhd[5] = 100;//d
            mdhd[6] = 104;//h
            mdhd[7] = 100;//d
            mdhd[8] = 0;//версия
            mdhd[9] = 0;//флаг
            mdhd[10] = 0;//флаг
            mdhd[11] = 0;//флаг
            mdhd[12] = 0;//время создания
            mdhd[13] = 0;//время создания
            mdhd[14] = 0;//время создания
            mdhd[15] = 0;//время создания
            mdhd[16] = 0;//время изменения
            mdhd[17] = 0;//время изменения
            mdhd[18] = 0;//время изменения
            mdhd[19] = 0;//время изменения
            mdhd[20] = 0;//time scale
            mdhd[21] = 0;//time scale
            mdhd[22] = 187;//time scale 48000
            mdhd[23] = 128;//time scale 48000
            mdhd[24] = Convert.ToByte(((sampleCount * 1024) & 0xFF000000) >> 24);
            mdhd[25] = Convert.ToByte(((sampleCount * 1024) & 0xFF0000) >> 16);
            mdhd[26] = Convert.ToByte(((sampleCount * 1024) & 0xFF00) >> 8);
            mdhd[27] = Convert.ToByte((sampleCount * 1024) & 0xFF);
            mdhd[28] = 85;//язык
            mdhd[29] = 196;//язык
            mdhd[30] = 0;//Quality
            mdhd[31] = 0;//Quality

            //соберём mdia
            int mdiaLength = 8 + mdhd.Length + hdlr.Length + minf.Length;
            mdia = new byte[mdiaLength];
            mdia[0] = Convert.ToByte((mdiaLength & 0xFF000000) >> 24);//размер атома
            mdia[1] = Convert.ToByte((mdiaLength & 0xFF0000) >> 16);//размер атома
            mdia[2] = Convert.ToByte((mdiaLength & 0xFF00) >> 8);//размер атома
            mdia[3] = Convert.ToByte(mdiaLength & 0xFF);//размер атома
            mdia[4] = 109;//m
            mdia[5] = 100;//d
            mdia[6] = 105;//i
            mdia[7] = 97;//a
            Array.Copy(mdhd, 0, mdia, 8, mdhd.Length);
            Array.Copy(hdlr, 0, mdia, 8 + mdhd.Length, hdlr.Length);
            Array.Copy(minf, 0, mdia, 8 + mdhd.Length + hdlr.Length, minf.Length);

            elst = new byte[28];
            int audioDuration = sampleCount * 1024 * 1000 / 48000;
            elst[0] = 0;//размер атома
            elst[1] = 0;//размер атома
            elst[2] = 0;//размер атома
            elst[3] = 28;//размер атома
            elst[4] = 101;//e
            elst[5] = 108;//l
            elst[6] = 115;//s
            elst[7] = 116;//t
            elst[8] = 0;//версия
            elst[9] = 0;//флаг
            elst[10] = 0;//флаг
            elst[11] = 0;//флаг
            elst[12] = 0;//количество
            elst[13] = 0;//количество
            elst[14] = 0;//количество
            elst[15] = 1;//количество
            elst[16] = Convert.ToByte((audioDuration & 0xFF000000) >> 24);//длительность аудио
            elst[17] = Convert.ToByte((audioDuration & 0xFF0000) >> 16);//длительность аудио
            elst[18] = Convert.ToByte((audioDuration & 0xFF00) >> 8);//длительность аудио
            elst[19] = Convert.ToByte(audioDuration & 0xFF);//длительность аудио
            elst[20] = 0;//начальное время
            elst[21] = 0;//начальное время
            elst[22] = 0;//начальное время
            elst[23] = 0;//начальное время
            elst[24] = 0;//скорость аудио 01.00
            elst[25] = 1;//скорость аудио 01.00
            elst[26] = 0;//скорость аудио 01.00
            elst[27] = 0;//скорость аудио 01.00

            //соберём edts
            int edtsLength = 8 + elst.Length;
            edts = new byte[edtsLength];
            edts[0] = Convert.ToByte((edtsLength & 0xFF000000) >> 24);//размер атома
            edts[1] = Convert.ToByte((edtsLength & 0xFF0000) >> 16);//размер атома
            edts[2] = Convert.ToByte((edtsLength & 0xFF00) >> 8);//размер атома
            edts[3] = Convert.ToByte(edtsLength & 0xFF);//размер атома
            edts[4] = 101;//e
            edts[5] = 100;//d
            edts[6] = 116;//t
            edts[7] = 115;//s
            Array.Copy(elst, 0, edts, 8, elst.Length);

            tkhd = new byte[92];
            tkhd[0] = 0;//размер атома
            tkhd[1] = 0;//размер атома
            tkhd[2] = 0;//размер атома
            tkhd[3] = 92;//размер атома
            tkhd[4] = 116;//t
            tkhd[5] = 107;//k
            tkhd[6] = 104;//h
            tkhd[7] = 100;//d
            tkhd[8] = 0;//версия
            tkhd[9] = 0;//флаги
            tkhd[10] = 0;//флаги
            tkhd[11] = 15;//флаги
            tkhd[12] = 0;//время создания
            tkhd[13] = 0;//время создания
            tkhd[14] = 0;//время создания
            tkhd[15] = 0;//время создания
            tkhd[16] = 0;//время изменения
            tkhd[17] = 0;//время изменения
            tkhd[18] = 0;//время изменения
            tkhd[19] = 0;//время изменения
            tkhd[20] = 0;//track ID
            tkhd[21] = 0;//track ID
            tkhd[22] = 0;//track ID
            tkhd[23] = 1;//track ID
            tkhd[24] = 0;//зарезервировано
            tkhd[25] = 0;//зарезервировано
            tkhd[26] = 0;//зарезервировано
            tkhd[27] = 0;//зарезервировано
            tkhd[28] = Convert.ToByte((audioDuration & 0xFF000000) >> 24);//длительность аудио
            tkhd[29] = Convert.ToByte((audioDuration & 0xFF0000) >> 16);//длительность аудио
            tkhd[30] = Convert.ToByte((audioDuration & 0xFF00) >> 8);//длительность аудио
            tkhd[31] = Convert.ToByte(audioDuration & 0xFF);//длительность аудио
            tkhd[32] = 0;//зарезервировано
            tkhd[33] = 0;//зарезервировано
            tkhd[34] = 0;//зарезервировано
            tkhd[35] = 0;//зарезервировано
            tkhd[36] = 0;//зарезервировано
            tkhd[37] = 0;//зарезервировано
            tkhd[38] = 0;//зарезервировано
            tkhd[39] = 0;//зарезервировано
            tkhd[40] = 0;//слой
            tkhd[41] = 0;//слой
            tkhd[42] = 0;//тип данных (0 - видео, 1 - аудио, 2 - субтитры)
            tkhd[43] = 1;//тип данных (0 - видео, 1 - аудио, 2 - субтитры)
            tkhd[44] = 1;//громкость 1.0
            tkhd[45] = 0;//громкость 1.0
            tkhd[46] = 0;//зарезервировано
            tkhd[47] = 0;//зарезервировано
            tkhd[48] = 0;//матрица
            tkhd[49] = 1;//матрица
            tkhd[50] = 0;//матрица
            tkhd[51] = 0;//матрица
            tkhd[52] = 0;//матрица
            tkhd[53] = 0;//матрица
            tkhd[54] = 0;//матрица
            tkhd[55] = 0;//матрица
            tkhd[56] = 0;//матрица
            tkhd[57] = 0;//матрица
            tkhd[58] = 0;//матрица
            tkhd[59] = 0;//матрица
            tkhd[60] = 0;//матрица
            tkhd[61] = 0;//матрица
            tkhd[62] = 0;//матрица
            tkhd[63] = 0;//матрица
            tkhd[64] = 0;//матрица
            tkhd[65] = 1;//матрица
            tkhd[66] = 0;//матрица
            tkhd[67] = 0;//матрица
            tkhd[68] = 0;//матрица
            tkhd[69] = 0;//матрица
            tkhd[70] = 0;//матрица
            tkhd[71] = 0;//матрица
            tkhd[72] = 0;//матрица
            tkhd[73] = 0;//матрица
            tkhd[74] = 0;//матрица
            tkhd[75] = 0;//матрица
            tkhd[76] = 0;//матрица
            tkhd[77] = 0;//матрица
            tkhd[78] = 0;//матрица
            tkhd[79] = 0;//матрица
            tkhd[80] = 64;//матрица
            tkhd[81] = 0;//матрица
            tkhd[82] = 0;//матрица
            tkhd[83] = 0;//матрица
            tkhd[84] = 0;//ширина
            tkhd[85] = 0;//ширина
            tkhd[86] = 0;//ширина
            tkhd[87] = 0;//ширина
            tkhd[88] = 0;//высота
            tkhd[89] = 0;//высота
            tkhd[90] = 0;//высота
            tkhd[91] = 0;//высота

            //соберём trak
            int trakLength = 8 + tkhd.Length + edts.Length + mdia.Length;
            trak = new byte[trakLength];
            trak[0] = Convert.ToByte((trakLength & 0xFF000000) >> 24);//размер атома
            trak[1] = Convert.ToByte((trakLength & 0xFF0000) >> 16);//размер атома
            trak[2] = Convert.ToByte((trakLength & 0xFF00) >> 8);//размер атома
            trak[3] = Convert.ToByte(trakLength & 0xFF);//размер атома
            trak[4] = 116;//t
            trak[5] = 114;//r
            trak[6] = 97;//a
            trak[7] = 107;//k
            Array.Copy(tkhd, 0, trak, 8, tkhd.Length);
            Array.Copy(edts, 0, trak, 8 + tkhd.Length, edts.Length);
            Array.Copy(mdia, 0, trak, 8 + tkhd.Length + edts.Length, mdia.Length);

            mvhd = new byte[108];
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
            mvhd[11] = 15;//флаги
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
            mvhd[24] = Convert.ToByte((audioDuration & 0xFF000000) >> 24);//длительность аудио
            mvhd[25] = Convert.ToByte((audioDuration & 0xFF0000) >> 16);//длительность аудио
            mvhd[26] = Convert.ToByte((audioDuration & 0xFF00) >> 8);//длительность аудио
            mvhd[27] = Convert.ToByte(audioDuration & 0xFF);//длительность аудио
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
            mvhd[107] = 2;//следующий ID трека

            //соберём moov
            int moovLength = 8 + mvhd.Length + trak.Length;
            moov = new byte[moovLength];
            moov[0] = Convert.ToByte((moovLength & 0xFF000000) >> 24);//размер атома
            moov[1] = Convert.ToByte((moovLength & 0xFF0000) >> 16);//размер атома
            moov[2] = Convert.ToByte((moovLength & 0xFF00) >> 8);//размер атома
            moov[3] = Convert.ToByte(moovLength & 0xFF);//размер атома
            moov[4] = 109;//m
            moov[5] = 111;//o
            moov[6] = 111;//o
            moov[7] = 118;//v
            Array.Copy(mvhd, 0, moov, 8, mvhd.Length);
            Array.Copy(trak, 0, moov, 8 + mvhd.Length, trak.Length);

            //соберём mp4
            int resultLength = ftyp.Length + free.Length + mdat.Length + moov.Length;
            result = new byte[resultLength];
            Array.Copy(ftyp, 0, result, 0, ftyp.Length);
            Array.Copy(free, 0, result, ftyp.Length, free.Length);
            Array.Copy(mdat, 0, result, ftyp.Length + free.Length, mdat.Length);
            Array.Copy(moov, 0, result, ftyp.Length + free.Length + mdat.Length, moov.Length);

            DT1 = DateTime.Now.Ticks;
            label1.Text = "Время создания mp4: " + ((DT1 - DT0) / 10000).ToString() + " миллисекунд";
            this.Text = "Время создания mp4: " + ((DT1 - DT0) / 10000).ToString() + " миллисекунд";

            return result;

        }

        byte[] ExtractStream(List<PacketTS> pTSs, int PID, int streamID)
        {
            //посчитаем общую длину пакетов по требуему PID'у
            int lengthPIDs = 0;
            for (int i = 0; i < pTSs.Count; i++)
            {
                if (pTSs[i].PID == PID)
                {
                    if (pTSs[i].data.Length != 0)
                    {
                        lengthPIDs += pTSs[i].data.Length;
                    }
                }
            }

            //соединим PES-пакеты в массив
            byte[] result = new byte[lengthPIDs];
            int currentPos = 0;
            for (int i = 0; i < pTSs.Count; i++)
            {
                if (pTSs[i].PID == PID)
                {
                    if (pTSs[i].data.Length != 0)
                    {
                        Array.Copy(pTSs[i].data, 0, result, currentPos, pTSs[i].data.Length);
                        currentPos += pTSs[i].data.Length;
                    }
                }
            }

            File.WriteAllBytes(@"C:\1\temp.xxx", result);//сохранение промежуточной информации(для отладки)

            //здесь будет чистый поток требуемых данных
            byte[] result2 = new byte[0];

            //извлечём данные из PES-пакетов
            int j = 0;//начало PES пакета
            while (j + 4 < result.Length)
            {
                //найдём префикс начала пакета PES (000001h), и идентификатор потока
                if (result[j] == 0 &&
                    result[j + 1] == 0 &&
                    result[j + 2] == 1 &&
                    result[j + 3] == streamID) //224 Для видео, 192 аудио
                {
                    int k = j + 4;//конец PES-пакета
                    while (k + 4 < result.Length)
                    {
                        if (result[k] == 0 &&
                        result[k + 1] == 0 &&
                        result[k + 2] == 1 &&
                        result[k + 3] == streamID) //224 Для видео, 192 аудио
                        {
                            //обработаем пакет
                            j = j + 4;//прибавим величину поля префикса и идентификатора (4 байта)
                            int x = result[j] * 256 + result[j + 1];//длина PES-пакета
                            j = j + 2;//прибавим величину поля длины PES-пакета
                            j = j + 2;//смещаем до поля длины заголовка PES-пакета
                            int y = result[j];//длина заголовка PES-пакета
                            j = j + 1;//прибавим величину поля длины заголовка PES-пакета
                            if (x != 0)
                            {
                                x = x - 3 - y;//длина полезных данных PES пакета
                            }
                            j = j + y;

                            //вырежем полезные данные из пакета
                            byte[] usefulPes = new byte[k - j];
                            Array.Copy(result, j, usefulPes, 0, k - j);
                            j = k;//сдвинем каретку на следующий PES-пакет
                            k = j + 4;

                            //вырежем стаффинговые байты
                            int g = 0;
                            while (g < usefulPes.Length)
                            {
                                if (g + 2 < usefulPes.Length)
                                {
                                    //если нашли начало "пустых" символов 00ff
                                    if (usefulPes[g + 1] == 0 &&
                                        usefulPes[g + 2] == 255)
                                    {
                                        //посмотрим их количество
                                        int count = 0;
                                        count = count + 2;
                                        while (usefulPes[g + count + 1] == 255)
                                        {
                                            count++;
                                            if (g + count + 1 >= usefulPes.Length)
                                            {
                                                break;
                                            }
                                        }

                                        //поле длины пустых символов
                                        int l = usefulPes[g];

                                        //сравним количество пустых символов и значение поля "длина пустых символов"
                                        if (l == count)
                                        {
                                            //это оказались пустые символы
                                            byte[] temp = new byte[usefulPes.Length];
                                            Array.Copy(usefulPes, 0, temp, 0, usefulPes.Length);
                                            usefulPes = new byte[temp.Length - (count + 1)];
                                            Array.Copy(temp, 0, usefulPes, 0, g);
                                            Array.Copy(temp, g + count + 1, usefulPes, g, temp.Length - (g + count + 1));
                                        }
                                    }
                                }
                                g++;
                            }

                            if (x == 0 ||
                                x > usefulPes.Length
                                )
                            {
                                //запишем в массив чистые данные из PES-пакета
                                Array.Resize(ref result2, result2.Length + usefulPes.Length);
                                Array.Copy(usefulPes, 0, result2, result2.Length - usefulPes.Length, usefulPes.Length);
                            }
                            else
                            {
                                Array.Resize(ref result2, result2.Length + x);
                                Array.Copy(usefulPes, 0, result2, result2.Length - x, x);
                            }
                        }
                        k++;
                    }
                }
                j++;
            }

            return result2;
        }

    }
}
