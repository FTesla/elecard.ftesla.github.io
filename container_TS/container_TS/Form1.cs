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
        int[] sizeSamplesV = new int[0];
        List<int> PTSsA = new List<int>();
        List<int> DTSsA = new List<int>();

        List<int> PTSsV = new List<int>();
        List<int> DTSsV = new List<int>();

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

                //выделим все потоки и сохраним (аудио 192-223, видо 224 - 239)
                int audioIndex = 0;
                int videoIndex = 0;
                for (int i = 0; i < streamIDs.Count; i++)
                {
                    //аудио
                    if (streamIDs[i] >= 192 &&
                        streamIDs[i] <=223)
                    {
                        //путь до файла сохранения
                        string filePathSaveAudio = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory) + @"\" + openFileDialog.SafeFileName + "_" + streamIDs[i] + ".mp4";
                        //File.WriteAllBytes(filePathSaveAudio, PackerMP4(ExtractStream(pTSs, PIDs[i], streamIDs[i])));
                        //File.WriteAllBytes(filePathSaveAudio, PackerMP4(ExtractStream(pTSs, PIDs[i], streamIDs[i])));
                        //PackerMP4(ExtractStream(pTSs, PIDs[i], streamIDs[i]));
                        audioIndex = i;
                    }

                    //видео
                    if (streamIDs[i] >= 224 &&
                        streamIDs[i] <= 239)
                    {
                        string filePathSaveVideo = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory) + @"\" + openFileDialog.SafeFileName + "_" + streamIDs[i] + ".raw";
                        //File.WriteAllBytes(filePathSaveVideo, ExtractStream(pTSs, PIDs[i], streamIDs[i]));
                        //ExtractStream(pTSs, PIDs[i], streamIDs[i]);
                        videoIndex = i;
                    }
                }

               // ExtractStream(pTSs, PIDs[videoIndex], streamIDs[videoIndex]);
                
                string filePathSave = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory) + @"\" + openFileDialog.SafeFileName + "_" + "full.mp4";
                File.WriteAllBytes(filePathSave, PackerMP4(ExtractStream(pTSs, PIDs[audioIndex], streamIDs[audioIndex]), ExtractStream(pTSs, PIDs[videoIndex], streamIDs[videoIndex])));
                

                DT1 = DateTime.Now.Ticks;
                //label1.Text = "Время обработки: " + ((DT1 - DT0) / 10000).ToString() + " миллисекунд";
                this.Text = "Время обработки: " + ((DT1 - DT0) / 10000).ToString() + " миллисекунд";
            }
        }


        byte[] PackerMP4(byte[] audioClean, byte[] videoClean)
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



            //подготовим видео (запишем размеры sample'ов)
            //int[] sizeSamplesV = new int[0];
            byte[] videoMP4 = videoClean;

            i = 0;
            int sampleCountV;
            int sampleIndexOld = 0;//предыдущий индекс семпла
            while (i + 3 < videoClean.Length)
            {
                if (videoClean[i] == 0 &&
                    videoClean[i + 1] == 0 &&
                    videoClean[i + 2] == 0 &&
                    videoClean[i + 3] == 1)
                {
                    //длина sample
                    int lengthSample = i - sampleIndexOld;
                    sampleIndexOld = i;
                    if (lengthSample != 0)
                    {
                        //запишем длину в массив
                        //Array.Resize(ref sizeSamplesV, sizeSamplesV.Length + 1);
                        //sizeSamplesV[sizeSamplesV.Length - 1] = lengthSample;
                    }
                }
                i++;
            }
            //запишем длину в массив
            //Array.Resize(ref sizeSamplesV, sizeSamplesV.Length + 1);
            //sizeSamplesV[sizeSamplesV.Length - 1] = videoClean.Length - sampleIndexOld;

            sampleCountV = sizeSamplesV.Length;



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

            byte[] trakV;
            byte[] tkhdV;
            byte[] edtsV;
            byte[] elstV;
            byte[] mdiaV;
            byte[] hdlrV;
            byte[] mdhdV;
            byte[] minfV;
            byte[] vmhdV;
            byte[] dinfV;
            byte[] stblV;
            byte[] stsdV;
            byte[] cttsV;
            byte[] sttsV;
            byte[] stscV;
            byte[] stszV;
            byte[] stcoV;

            ftyp = File.ReadAllBytes("ftyp");
            free = File.ReadAllBytes("free");

            int mdatLength = audioMP4.Length + videoClean.Length + 8;
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
            Array.Copy(videoMP4, 0, mdat, 8 + audioMP4.Length, videoMP4.Length);


            ///соберём аудио

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



            ///соберём видео
            
            stsdV = File.ReadAllBytes("stsdV");

            sttsV = new byte[24];
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
            sttsV[16] = Convert.ToByte((sampleCountV & 0xFF000000) >> 24);//количество sample'ов
            sttsV[17] = Convert.ToByte((sampleCountV & 0xFF0000) >> 16);  //количество sample'ов
            sttsV[18] = Convert.ToByte((sampleCountV & 0xFF00) >> 8);     //количество sample'ов
            sttsV[19] = Convert.ToByte(sampleCountV & 0xFF);              //количество sample'ов
            sttsV[20] = 0;//продолжительность sample (delta)
            sttsV[21] = 0;//продолжительность sample (delta)
            sttsV[22] = 2;//продолжительность sample (delta)
            sttsV[23] = 0;//продолжительность sample (delta)

            //cttsV = File.ReadAllBytes("cttsV");
            //cttsV = new byte[0];
            cttsV = new byte[16 + sampleCountV * 8];
            cttsV[0] = Convert.ToByte((cttsV.Length & 0xFF000000) >> 24);//размер атома
            cttsV[1] = Convert.ToByte((cttsV.Length & 0xFF0000) >> 16);  //размер атома
            cttsV[2] = Convert.ToByte((cttsV.Length & 0xFF00) >> 8);     //размер атома
            cttsV[3] = Convert.ToByte(cttsV.Length & 0xFF);              //размер атома
            cttsV[4] = 99;//c
            cttsV[5] = 116;//t
            cttsV[6] = 116;//t
            cttsV[7] = 115;//s
            cttsV[8] = 0;//версия
            cttsV[9] = 0;//флаг
            cttsV[10] = 0;//флаг
            cttsV[11] = 0;//флаг
            cttsV[12] = Convert.ToByte((sampleCountV & 0xFF000000) >> 24);//количество sample'ов
            cttsV[13] = Convert.ToByte((sampleCountV & 0xFF0000) >> 16);  //количество sample'ов
            cttsV[14] = Convert.ToByte((sampleCountV & 0xFF00) >> 8);     //количество sample'ов
            cttsV[15] = Convert.ToByte(sampleCountV & 0xFF);              //количество sample'ов
            int count = 1;
            for (int j = 0; j < PTSsV.Count; j++)
            {
                if(PTSsV[j] > DTSsV[j])
                {
                    cttsV[16 + (count - 1) * 8] = 0;//количество sample'ов
                    cttsV[16 + (count - 1) * 8 + 1] = 0;  //количество sample'ов
                    cttsV[16 + (count - 1) * 8 + 2] = 0;     //количество sample'ов
                    cttsV[16 + (count - 1) * 8 + 3] = 1;              //количество sample'ов
                    if (DTSsV[j] != 0)
                    {
                        int sampleDuration = (PTSsV[j] - DTSsV[j]) * 12288 / 90000;
                        cttsV[16 + (count - 1) * 8 + 4] = Convert.ToByte((sampleDuration & 0xFF000000) >> 24);//продолжительность семпла
                        cttsV[16 + (count - 1) * 8 + 5] = Convert.ToByte((sampleDuration & 0xFF0000) >> 16);  //продолжительность семпла
                        cttsV[16 + (count - 1) * 8 + 6] = Convert.ToByte((sampleDuration & 0xFF00) >> 8);     //продолжительность семпла
                        cttsV[16 + (count - 1) * 8 + 7] = Convert.ToByte(sampleDuration & 0xFF);              //продолжительность семпла
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
            

            stscV = new byte[28];
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
            stscV[20] = Convert.ToByte((sampleCountV & 0xFF000000) >> 24);//количество sample'ов в куске
            stscV[21] = Convert.ToByte((sampleCountV & 0xFF0000) >> 16);  //количество sample'ов в куске
            stscV[22] = Convert.ToByte((sampleCountV & 0xFF00) >> 8);     //количество sample'ов в куске
            stscV[23] = Convert.ToByte(sampleCountV & 0xFF);              //количество sample'ов в куске
            stscV[24] = 0;//ID sample
            stscV[25] = 0;//ID sample
            stscV[26] = 0;//ID sample
            stscV[27] = 1;//ID sample

            int stszSizeV = 20 + sampleCountV * 4;
            stszV = new byte[stszSizeV];
            stszV[0] = Convert.ToByte((stszSizeV & 0xFF000000) >> 24);//размер атома
            stszV[1] = Convert.ToByte((stszSizeV & 0xFF0000) >> 16);  //размер атома
            stszV[2] = Convert.ToByte((stszSizeV & 0xFF00) >> 8);     //размер атома
            stszV[3] = Convert.ToByte(stszSizeV & 0xFF);              //размер атома
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
            stszV[16] = Convert.ToByte((sampleCountV & 0xFF000000) >> 24);//количество sample'ов
            stszV[17] = Convert.ToByte((sampleCountV & 0xFF0000) >> 16);  //количество sample'ов
            stszV[18] = Convert.ToByte((sampleCountV & 0xFF00) >> 8);     //количество sample'ов
            stszV[19] = Convert.ToByte(sampleCountV & 0xFF);              //количество sample'ов
            for (i = 0; i < sizeSamplesV.Length; i++)
            {
                stszV[20 + i * 4] = Convert.ToByte((sizeSamplesV[i] & 0xFF000000) >> 24);    //размер sample'а
                stszV[20 + i * 4 + 1] = Convert.ToByte((sizeSamplesV[i] & 0xFF0000) >> 16);  //размер sample'а
                stszV[20 + i * 4 + 2] = Convert.ToByte((sizeSamplesV[i] & 0xFF00) >> 8);     //размер sample'а
                stszV[20 + i * 4 + 3] = Convert.ToByte(sizeSamplesV[i] & 0xFF);              //размер sample'а
            }

            stcoV = new byte[20];
            stcoV[0] = Convert.ToByte((stcoV.Length & 0xFF000000) >> 24);//размер атома
            stcoV[1] = Convert.ToByte((stcoV.Length & 0xFF0000) >> 16);  //размер атома
            stcoV[2] = Convert.ToByte((stcoV.Length & 0xFF00) >> 8);     //размер атома
            stcoV[3] = Convert.ToByte(stcoV.Length & 0xFF);              //размер атома
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
            stcoV[16] = Convert.ToByte(((ftyp.Length + free.Length + audioMP4.Length + 8) & 0xFF000000) >> 24);//указатель на начало данных
            stcoV[17] = Convert.ToByte(((ftyp.Length + free.Length + audioMP4.Length + 8) & 0xFF0000) >> 16);  //указатель на начало данных
            stcoV[18] = Convert.ToByte(((ftyp.Length + free.Length + audioMP4.Length + 8) & 0xFF00) >> 8);     //указатель на начало данных
            stcoV[19] = Convert.ToByte((ftyp.Length + free.Length + audioMP4.Length + 8) & 0xFF);              //указатель на начало данных


            //соберём stbl
            int stblLengthV = 8 + stsdV.Length + sttsV.Length + cttsV.Length + stscV.Length + stszV.Length + stcoV.Length;
            stblV = new byte[stblLengthV];
            stblV[0] = Convert.ToByte((stblLengthV & 0xFF000000) >> 24);//размер атома
            stblV[1] = Convert.ToByte((stblLengthV & 0xFF0000) >> 16);  //размер атома
            stblV[2] = Convert.ToByte((stblLengthV & 0xFF00) >> 8);     //размер атома
            stblV[3] = Convert.ToByte(stblLengthV & 0xFF);              //размер атома
            stblV[4] = 115;//s
            stblV[5] = 116;//t
            stblV[6] = 98;//b
            stblV[7] = 108;//l
            Array.Copy(stsdV, 0, stblV, 8, stsdV.Length);
            Array.Copy(sttsV, 0, stblV, 8 + stsdV.Length, sttsV.Length);
            Array.Copy(cttsV, 0, stblV, 8 + stsdV.Length + sttsV.Length, cttsV.Length);
            Array.Copy(stscV, 0, stblV, 8 + stsdV.Length + sttsV.Length + cttsV.Length, stscV.Length);
            Array.Copy(stszV, 0, stblV, 8 + stsdV.Length + sttsV.Length + cttsV.Length + stscV.Length, stszV.Length);
            Array.Copy(stcoV, 0, stblV, 8 + stsdV.Length + sttsV.Length + cttsV.Length + stscV.Length + stszV.Length, stcoV.Length);

            dinfV = File.ReadAllBytes("dinfV");
            vmhdV = File.ReadAllBytes("vmhdV");

            //соберём minf
            int minfLengthV = 8 + vmhdV.Length + dinfV.Length + stblV.Length;
            minfV = new byte[minfLengthV];
            minfV[0] = Convert.ToByte((minfLengthV & 0xFF000000) >> 24);//размер атома
            minfV[1] = Convert.ToByte((minfLengthV & 0xFF0000) >> 16);//размер атома
            minfV[2] = Convert.ToByte((minfLengthV & 0xFF00) >> 8);//размер атома
            minfV[3] = Convert.ToByte((minfLengthV & 0xFF));//размер атома
            minfV[4] = 109;//m
            minfV[5] = 105;//i
            minfV[6] = 110;//n
            minfV[7] = 102;//f
            Array.Copy(vmhdV, 0, minfV, 8, vmhdV.Length);
            Array.Copy(dinfV, 0, minfV, 8 + vmhdV.Length, dinfV.Length);
            Array.Copy(stblV, 0, minfV, 8 + vmhdV.Length + dinfV.Length, stblV.Length);

            hdlrV = File.ReadAllBytes("hdlrV");

            mdhdV = new byte[32];
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
            mdhdV[20] = 0;//time scale
            mdhdV[21] = 0;//time scale
            mdhdV[22] = 48;//time scale 12288
            mdhdV[23] = 0;//time scale 12288
            mdhdV[24] = Convert.ToByte(((sampleCountV * 512) & 0xFF000000) >> 24);
            mdhdV[25] = Convert.ToByte(((sampleCountV * 512) & 0xFF0000) >> 16);
            mdhdV[26] = Convert.ToByte(((sampleCountV * 512) & 0xFF00) >> 8);
            mdhdV[27] = Convert.ToByte((sampleCountV * 512) & 0xFF);
            mdhdV[28] = 85;//язык
            mdhdV[29] = 196;//язык
            mdhdV[30] = 0;//Quality
            mdhdV[31] = 0;//Quality

            //соберём mdia
            int mdiaLengthV = 8 + mdhdV.Length + hdlrV.Length + minfV.Length;
            mdiaV = new byte[mdiaLengthV];
            mdiaV[0] = Convert.ToByte((mdiaLengthV & 0xFF000000) >> 24);//размер атома
            mdiaV[1] = Convert.ToByte((mdiaLengthV & 0xFF0000) >> 16);//размер атома
            mdiaV[2] = Convert.ToByte((mdiaLengthV & 0xFF00) >> 8);//размер атома
            mdiaV[3] = Convert.ToByte(mdiaLengthV & 0xFF);//размер атома
            mdiaV[4] = 109;//m
            mdiaV[5] = 100;//d
            mdiaV[6] = 105;//i
            mdiaV[7] = 97;//a
            Array.Copy(mdhdV, 0, mdiaV, 8, mdhdV.Length);
            Array.Copy(hdlrV, 0, mdiaV, 8 + mdhdV.Length, hdlrV.Length);
            Array.Copy(minfV, 0, mdiaV, 8 + mdhdV.Length + hdlrV.Length, minfV.Length);

            elstV = new byte[28];
            int videoDuration = sampleCountV * 512 * 1000 / 12288;
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
            elstV[16] = Convert.ToByte((videoDuration & 0xFF000000) >> 24);//длительность видео
            elstV[17] = Convert.ToByte((videoDuration & 0xFF0000) >> 16);//длительность видео
            elstV[18] = Convert.ToByte((videoDuration & 0xFF00) >> 8);//длительность видео
            elstV[19] = Convert.ToByte(videoDuration & 0xFF);//длительность видео
            elstV[20] = 0;//начальное время
            elstV[21] = 0;//начальное время
            elstV[22] = 0;//начальное время
            elstV[23] = 0;//начальное время
            elstV[24] = 0;//скорость видео 01.00
            elstV[25] = 1;//скорость видео 01.00
            elstV[26] = 0;//скорость видео 01.00
            elstV[27] = 0;//скорость видео 01.00

            //соберём edts
            int edtsLengthV = 8 + elstV.Length;
            edtsV = new byte[edtsLengthV];
            edtsV[0] = Convert.ToByte((edtsLengthV & 0xFF000000) >> 24);//размер атома
            edtsV[1] = Convert.ToByte((edtsLengthV & 0xFF0000) >> 16);//размер атома
            edtsV[2] = Convert.ToByte((edtsLengthV & 0xFF00) >> 8);//размер атома
            edtsV[3] = Convert.ToByte(edtsLengthV & 0xFF);//размер атома
            edtsV[4] = 101;//e
            edtsV[5] = 100;//d
            edtsV[6] = 116;//t
            edtsV[7] = 115;//s
            Array.Copy(elstV, 0, edtsV, 8, elstV.Length);

            tkhdV = new byte[92];
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
            tkhdV[28] = Convert.ToByte((videoDuration & 0xFF000000) >> 24);//длительность аудио
            tkhdV[29] = Convert.ToByte((videoDuration & 0xFF0000) >> 16);//длительность аудио
            tkhdV[30] = Convert.ToByte((videoDuration & 0xFF00) >> 8);//длительность аудио
            tkhdV[31] = Convert.ToByte(videoDuration & 0xFF);//длительность аудио
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
            int trakLengthV = 8 + tkhdV.Length + edtsV.Length + mdiaV.Length;
            trakV = new byte[trakLengthV];
            trakV[0] = Convert.ToByte((trakLengthV & 0xFF000000) >> 24);//размер атома
            trakV[1] = Convert.ToByte((trakLengthV & 0xFF0000) >> 16);//размер атома
            trakV[2] = Convert.ToByte((trakLengthV & 0xFF00) >> 8);//размер атома
            trakV[3] = Convert.ToByte(trakLengthV & 0xFF);//размер атома
            trakV[4] = 116;//t
            trakV[5] = 114;//r
            trakV[6] = 97;//a
            trakV[7] = 107;//k
            Array.Copy(tkhdV, 0, trakV, 8, tkhdV.Length);
            Array.Copy(edtsV, 0, trakV, 8 + tkhdV.Length, edtsV.Length);
            Array.Copy(mdiaV, 0, trakV, 8 + tkhdV.Length + edtsV.Length, mdiaV.Length);



            //соберём аудио и видео вместе в moov
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
            mvhd[24] = Convert.ToByte((audioDuration & 0xFF000000) >> 24);//длительность
            mvhd[25] = Convert.ToByte((audioDuration & 0xFF0000) >> 16);//длительность
            mvhd[26] = Convert.ToByte((audioDuration & 0xFF00) >> 8);//длительность
            mvhd[27] = Convert.ToByte(audioDuration & 0xFF);//длительность
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
            int moovLength = 8 + mvhd.Length + trak.Length + trakV.Length;
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
            Array.Copy(trakV, 0, moov, 8 + mvhd.Length + trak.Length, trakV.Length);

            //соберём mp4
            int resultLength = ftyp.Length + free.Length + mdat.Length + moov.Length;
            result = new byte[resultLength];
            Array.Copy(ftyp, 0, result, 0, ftyp.Length);
            Array.Copy(free, 0, result, ftyp.Length, free.Length);
            Array.Copy(mdat, 0, result, ftyp.Length + free.Length, mdat.Length);
            Array.Copy(moov, 0, result, ftyp.Length + free.Length + mdat.Length, moov.Length);

            DT1 = DateTime.Now.Ticks;
            label1.Text = "Время создания mp4: " + ((DT1 - DT0) / 10000).ToString() + " миллисекунд";
            //this.Text = "Время создания mp4: " + ((DT1 - DT0) / 10000).ToString() + " миллисекунд";

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

            int countBegin = 0;
            for (int i = 0; i < pTSs.Count; i++)
            {
                if (pTSs[i].PID == PID &&
                    pTSs[i].FlagBeginData == 1)
                {
                    countBegin++;
                }
            }
            lengthPIDs += countBegin * 6;

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

            

            //здесь будет чистый поток требуемых данных
            byte[] result2 = new byte[0];

            //извлечём данные из PES-пакетов
            sizeSamplesV = new int[0];
            int j = 0;//начало PES пакета
            int tempInt = 0;
            List<int> tempList = new List<int>();
            byte[] tempByte = new byte[0];
            while (j + 6 < result.Length)
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


                            //разберём дополнительные поля pes-заголовков
                            tempList.Add(y);
                            Array.Resize(ref tempByte, tempByte.Length + y);
                            Array.Copy(result, j - y, tempByte, tempByte.Length - y, y);

                            if (y != 0)
                            {
                                byte[] pesHead = new byte[y];
                                Array.Copy(result, j - y, pesHead, 0, y);

                                //только PTS
                                if (((pesHead[0] & 0xF0) >> 4) == 2)
                                {
                                    int PTS = 0;
                                    PTS += (pesHead[0] & 0xE) << 29;
                                    PTS += pesHead[1] << 22;
                                    PTS += (pesHead[2] & 0xFE) << 14;
                                    PTS += pesHead[3] << 7;
                                    PTS += (pesHead[4] & 0xFE) >> 1;

                                    if (streamID == 224)
                                    {
                                        PTSsV.Add(PTS);
                                        DTSsV.Add(0);
                                    }
                                    if (streamID == 192)
                                    {
                                        PTSsA.Add(PTS);
                                        DTSsA.Add(0);
                                    }
                                }

                                //PTS + DTS
                                if (((pesHead[0] & 0xF0) >> 4) == 3)
                                {
                                    int PTS = 0;
                                    int DTS = 0;
                                    PTS += (pesHead[0] & 0xE) << 29;
                                    PTS += pesHead[1] << 22;
                                    PTS += (pesHead[2] & 0xFE) << 14;
                                    PTS += pesHead[3] << 7;
                                    PTS += (pesHead[4] & 0xFE) >> 1;

                                    DTS += (pesHead[5] & 0xE) >> 29;
                                    DTS += pesHead[6] << 22;
                                    DTS += (pesHead[7] & 0xFE) << 14;
                                    DTS += pesHead[8] << 7;
                                    DTS += (pesHead[9] & 0xFE) >> 1;

                                    if (streamID == 224)
                                    {
                                        PTSsV.Add(PTS);
                                        DTSsV.Add(DTS);
                                    }
                                    if (streamID == 192)
                                    {
                                        PTSsA.Add(PTS);
                                        DTSsA.Add(DTS);
                                    }
                                }
                            }

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
                                x > usefulPes.Length)
                            {
                                if (streamID == 224)
                                {
                                    if (PTSsV[PTSsV.Count - 1] > DTSsV[DTSsV.Count - 1])
                                    {
                                        usefulPes[3] = 2;

                                        usefulPes[6] = Convert.ToByte(((usefulPes.Length - 10) & 0xFF000000) >> 24);//размер
                                        usefulPes[7] = Convert.ToByte(((usefulPes.Length - 10) & 0xFF0000) >> 16);//размер
                                        usefulPes[8] = Convert.ToByte(((usefulPes.Length - 10) & 0xFF00) >> 8);//размер
                                        usefulPes[9] = Convert.ToByte((usefulPes.Length - 10) & 0xFF);//размер

                                        //запишем в массив чистые данные из PES-пакета
                                        Array.Resize(ref result2, result2.Length + usefulPes.Length);
                                        Array.Copy(usefulPes, 0, result2, result2.Length - usefulPes.Length, usefulPes.Length);

                                        Array.Resize(ref sizeSamplesV, sizeSamplesV.Length + 1);
                                        sizeSamplesV[sizeSamplesV.Length - 1] = usefulPes.Length;
                                    }
                                }
                                if (streamID == 192)
                                {
                                    if (PTSsA[PTSsA.Count - 1] > DTSsA[DTSsA.Count - 1])
                                    {
                                        //запишем в массив чистые данные из PES-пакета
                                        Array.Resize(ref result2, result2.Length + usefulPes.Length);
                                        Array.Copy(usefulPes, 0, result2, result2.Length - usefulPes.Length, usefulPes.Length);

                                        Array.Resize(ref sizeSamplesV, sizeSamplesV.Length + 1);
                                        sizeSamplesV[sizeSamplesV.Length - 1] = usefulPes.Length;
                                    }
                                }
                            }
                            else
                            {
                                if (streamID == 224)
                                {
                                    if (PTSsV[PTSsV.Count - 1] > DTSsV[DTSsV.Count - 1])
                                    {
                                        usefulPes[3] = 2;

                                        usefulPes[6] = Convert.ToByte(((x - 10) & 0xFF000000) >> 24);//размер
                                        usefulPes[7] = Convert.ToByte(((x - 10) & 0xFF0000) >> 16);//размер
                                        usefulPes[8] = Convert.ToByte(((x - 10) & 0xFF00) >> 8);//размер
                                        usefulPes[9] = Convert.ToByte((x - 10) & 0xFF);//размер

                                        Array.Resize(ref result2, result2.Length + x);
                                        Array.Copy(usefulPes, 0, result2, result2.Length - x, x);

                                        Array.Resize(ref sizeSamplesV, sizeSamplesV.Length + 1);
                                        sizeSamplesV[sizeSamplesV.Length - 1] = x;
                                    }
                                }
                                if (streamID == 192)
                                {
                                    if (PTSsA[PTSsA.Count - 1] > DTSsA[DTSsA.Count - 1])
                                    {
                                        Array.Resize(ref result2, result2.Length + x);
                                        Array.Copy(usefulPes, 0, result2, result2.Length - x, x);

                                        Array.Resize(ref sizeSamplesV, sizeSamplesV.Length + 1);
                                        sizeSamplesV[sizeSamplesV.Length - 1] = x;
                                    }
                                }
                            }



                        }
                        k++;
                    }
                }
                
                j++;
            }

            //File.WriteAllBytes(@"C:\3\temp.xxx", tempByte);//сохранение промежуточной информации(для отладки)

            return result2;
        }

    }
}
