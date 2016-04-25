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
                        string filePathSaveAudio = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory) + @"\" + openFileDialog.SafeFileName + "_" + streamIDs[i] + ".aac";
                        File.WriteAllBytes(filePathSaveAudio, ExtractStream(pTSs, PIDs[i], streamIDs[i]));
                    }

                    //видео
                    if (streamIDs[i] >= 224 &&
                        streamIDs[i] <= 239)
                    {
                        string filePathSaveVideo = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory) + @"\" + openFileDialog.SafeFileName + "_" + streamIDs[i] + ".raw";
                        File.WriteAllBytes(filePathSaveVideo, ExtractStream(pTSs, PIDs[i], streamIDs[i]));
                    }
                }
                
                label1.Text = "Файлы сохранёны на рабочем столе";

                DT1 = DateTime.Now.Ticks;
                this.Text = "Время обработки: " + ((DT1 - DT0) / 10000).ToString() + " миллисекунд";
            }
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

            //File.WriteAllBytes(@"C:\1\temp.xxx", result);//сохранение промежуточной информации(для отладки)

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
