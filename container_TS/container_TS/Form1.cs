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
                //хранит TS пакеты
                List<PacketTS> pTSs = new List<PacketTS>();
                int PID = 257; //256 видео (пока не работает), временный костыль, нужно разбирать служебную таблицу для выделения PID

                //массив для хранения файла
                byte[] fileByte;
                //откроем файл
                fileByte = File.ReadAllBytes(openFileDialog.FileName);

                //для подсчёта времени выполнения кода
                long DT0 = DateTime.Now.Ticks;
                long DT1 = 0;

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

                    //синхробайт
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

                    //занесём "полезные" данные
                    Array.Copy(fileByte, i * 188 + 4, pTS.data, 0, 184);

                    //добавим текущий пакет в массив пакетов
                    pTSs.Add(pTS);
                }

                //посчитаем количество пакетов по требуему PID'у
                int ch = 0;
                for (int i = 0; i < pTSs.Count; i++)
                {
                    if (pTSs[i].PID == PID)
                    {
                        ch++;
                    }
                }

                //соединим требуемые пакеты в массив
                byte[] result = new byte[ch * 184];
                ch = 0;
                for (int i = 0; i < pTSs.Count; i++)
                {
                    if (pTSs[i].PID == PID)
                    {
                        //Array.Resize(ref result, result.Length + 184);
                        Array.Copy(pTSs[i].data, 0, result, ch * 184, 184);
                        ch++;
                    }
                }

                //извлечём чистый поток
                byte[] result2 = new byte[0];//здесь будет чистый поток требуемых данных (на текущий момент аудио)
                int j = 0;//положение в потоке PES пакетов
                while (j < result.Length)
                {
                    //найдём префикс начала пакета PES (000001h), и идентификатор потока
                    if (result[j] == 0 && 
                        result[j + 1] == 0 && 
                        result[j + 2] == 1 && 
                        result[j + 3] == 192) //224 Для видео
                    {
                        j = j + 4;//прибавим величину поля префикса и идентификатора (4 байта)
                        int x = result[j] * 256 + result[j + 1];//длина PES-пакета
                        j = j + 2;//прибавим величину поля длины PES-пакета
                        j = j + 2;//смещаем до поля длины заголовка PES-пакета
                        int y = result[j];//длина заголовка PES-пакета
                        j = j + 1;//прибавим величину поля длины заголовка PES-пакета
                        x = x - 3 - y;//длина полезных данных PES пакета
                        j = j + y;

                        int x2 = 0;//количетство извлечённых байтов из PES-пакета
                        while (x2 < x)
                        {
                            if (j + 2 <= result.Length - 1)
                            {
                                //если нашли начало "пустых" символов 00ff
                                if (result[j + 1] == 0 && 
                                    result[j + 2] == 255)
                                {
                                    //посмотрим их количество
                                    int count = 0;
                                    count = count + 2;
                                    while (result[j + count + 1] == 255)
                                    {
                                        count++;
                                    }

                                    //поле длины пустых символов
                                    int l = result[j];

                                    //сравним количество пустых символов и значение поля "длина пустых символов"
                                    if (l == count)
                                    {
                                        //это оказались пустые символы
                                        j = j + 1;
                                        j = j + count;
                                    }
                                }
                            }

                            //запишем байт в чистый поток
                            Array.Resize(ref result2, result2.Length + 1);
                            Array.Copy(result, j, result2, result2.Length - 1, 1);
                            j++;
                            x2++;
                        }
                    }
                    else
                    {
                        j++;
                    }
                }

                DT1 = DateTime.Now.Ticks;
                this.Text = "Время обработки: " + ((DT1 - DT0) / 10000).ToString() + " миллисекунд";

                //путь до файла сохранения
                string filePathSave = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory) + @"\" + openFileDialog.SafeFileName + ".aac";

                //сохраняем файл
                File.WriteAllBytes(filePathSave, result2);

                label1.Text = "Файл сохранён в " + filePathSave;
            }
        }

    }
}
