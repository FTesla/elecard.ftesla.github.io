//путь до файла со списком плейлистов
var pathPlaylists = "";
//путь до плейлиста
var pathPlaylist = "";

//семафор для последовательной загрузки медиа файлов
var loads = false;

//количество медиа файлов в плейлисте
var countMediaFiles = 1;

//время начала и конца операции скачивания медиа файла
var timeStart = 0;	
var timeStop = 0;	
	
//ссылка на файл плейлистов
var linkToPlaylists = "";	
	
function GetXmlHttp()
{
	var xmlHttp;
	try 
	{
		xmlHttp = new ActiveXObject("Msxml2.XMLHTTP");
	}
	catch (e)
	{
		try 
		{
			xmlHttp = new ActiveXObject("Microsoft.XMLHTTP");
		} 
		catch (E) 
		{
			xmlHttp = false;
		}
	}
	if (!xmlHttp && 
		typeof XMLHttpRequest != 'undefined') 
	{
		xmlHttp = new XMLHttpRequest();
	}
	return xmlHttp;
}

//получить список плейлистов 
function GetPlaylists() 
{
	//ссылка на файл плейлистов
	linkToPlaylists = document.getElementById('Playlists').value;
	if(linkToPlaylists.length > 4)
	{
		
		//расширение плейлиста
		if(linkToPlaylists.substr(-4) == 'm3u8')
		{
			if(linkToPlaylists.indexOf("http://") == -1 && 
			   linkToPlaylists.indexOf("https://") == -1)
			{
				linkToPlaylists = "http://" + linkToPlaylists;			
			}
			countMediaFiles = 1;
			//получить директорию файла с плейлистами
			pathPlaylists = linkToPlaylists;
			while(pathPlaylists.charAt(pathPlaylists.length - 1) != "/")
			{
				pathPlaylists = pathPlaylists.substring(0, pathPlaylists.length - 1);
			}
			
			var request = GetXmlHttp();
			request.onreadystatechange = function() 
			{ 		
				// onreadystatechange активируется при получении ответа сервера
				if (request.readyState == 4) {
					// если запрос закончил выполняться
					if(request.status == 200) 
					{
						var response = request.responseText;				
						FindPlaylist(response);																		
					}
					else
					{
						document.getElementById('info').innerHTML = "Плейлист не найден, пожалуйста, проверьте введённый URL.";
					}
				}
			}
			
			request.open('GET', linkToPlaylists, true);
			request.send(null);
		}
		else
		{
			//расширение видео
			if (linkToPlaylists.substr(-4) == '.avi' ||
				linkToPlaylists.substr(-4) == '.flv' ||
				linkToPlaylists.substr(-4) == 'm2ts' ||
				linkToPlaylists.substr(-4) == '.mov' ||
				linkToPlaylists.substr(-4) == '.mp4' ||
				linkToPlaylists.substr(-4) == '.mpg' ||
				linkToPlaylists.substr(-4) == 'webm' ||
				linkToPlaylists.substr(-4) == '.wmv'||
				linkToPlaylists.substr(-4) == '.mkv')
			{
				
				document.getElementById('videoTag').setAttribute('src', linkToPlaylists);
				document.getElementById('videoTag').load();
				document.getElementById('videoTag').play();						
			}
			else
			{
				document.getElementById('info').innerHTML = "Плейлист/видеофайл не найден, пожалуйста, проверьте введённый URL.";
			}
		}
	}
}

//найти плейлист с наибольшим битрейтом
function FindPlaylist(playlists)
{
	if(playlists.length > 0)
	{
		if(playlists.indexOf("#EXT-X-STREAM-INF") != -1)
		{
			//разделим на строки и упорядочим в массив
			var arrayPlaylists = new Array();
			var i = 0;//номер строки
			while(playlists.indexOf('\n') != -1)
			{
				arrayPlaylists[i] = playlists.substr(0,playlists.indexOf('\n'));
				playlists = playlists.substr(playlists.indexOf('\n') + 1);					
				i++;				
			}
			
			//преобразуем в удобный вид
			var bandwidth = new Array();//хранит качество
			var link = new Array();//хранит ссылку
			var nomerPlaylist = 0;//номер плейлиста
			for (var j = 0; j < arrayPlaylists.length; j++) 
			{
				//найден файл в плейлисте
				if(arrayPlaylists[j].indexOf("#EXT-X-STREAM-INF") != -1)
				{
					arrayPlaylists[j] = arrayPlaylists[j].substr(arrayPlaylists[j].indexOf("BANDWIDTH=") + 10);
					if(arrayPlaylists[j].indexOf(",") != -1) 
					{
						arrayPlaylists[j] = arrayPlaylists[j].substr(0, arrayPlaylists[j].indexOf(","));
					}				
					bandwidth[nomerPlaylist] = parseInt(arrayPlaylists[j],10);
					j++;
					if(arrayPlaylists[j].length == 0) j++;
					link[nomerPlaylist] = arrayPlaylists[j];
					nomerPlaylist++;
				}				
			}
			
			//поиск максимального качества
			var maxIndex = 0;
			if(bandwidth.length > 0)
			{					
				for (var k = 1; k < bandwidth.length; k++) 
				{
					if(bandwidth[k] > bandwidth[maxIndex]) maxIndex = k;
				}
			}
			//проверим абсолютный путь в ссылке до плейлиста
			if(link[maxIndex].indexOf("http://") != -1)
			{
				GetPlaylist(link[maxIndex]);
			}
			else
			{
				GetPlaylist(pathPlaylists + link[maxIndex]);
			}
		}
		else
		{
			if(playlists.indexOf("#EXTINF") != -1)
			{
				//заданный пользователем URL содержит уже конкретный плейлист
				GetPlaylist(linkToPlaylists);
			}
			else
			{
				document.getElementById('info').innerHTML = "Указанный файл не является плейлистом.";
			}
		}
	}
}

//получим конкретный плейлист
function GetPlaylist(link) 
{
	pathPlaylist = link;
	while(pathPlaylist.charAt(pathPlaylist.length - 1) != "/")
	{
		pathPlaylist = pathPlaylist.substring(0, pathPlaylist.length - 1);
	}
	
    var request = GetXmlHttp();
    request.onreadystatechange = function() 
	{ 	
        // onreadystatechange активируется при получении ответа сервера
        if (request.readyState == 4) {
            // если запрос закончил выполняться
            if(request.status == 200) 
			{
				var response = request.responseText;
			
				if(response.length > 0)
				{
					if(response.indexOf("#EXTINF") != -1)
					{
						//разделим на строки
						var a = new Array();
						var i = 0;
						while(response.indexOf('\n') != -1)
						{
							a[i] = response.substr(0,response.indexOf('\n'));
							response = response.substr(response.indexOf('\n') + 1);					
							i++;				
						}
						
						//преобразуем в удобный вид
						var linksToMediaFiles = new Array();
						var nomerMediaFile = 0;//номер медиа файла
						for (var j = 0; j < a.length; j++) 
						{
							//найден файл в плейлисте
							if(a[j].indexOf("#EXTINF") != -1)
							{
								j++;
								linksToMediaFiles[nomerMediaFile] = a[j];
								nomerMediaFile++;
							}				
						}
																																	
						document.getElementById('info').innerHTML = "Количество TS файлов в плейлисте: " + linksToMediaFiles.length;
						
						//запишем данные в таблицу
						var newElem=document.createElement("table");
						var newRow=newElem.insertRow(0);
						
						var newCell = newRow.insertCell(0);
						newCell.width="250";
						newCell.innerHTML="<b>порядковый номер TS-файла</b>";
						
						var newCell = newRow.insertCell(1);
						newCell.width="200";
						newCell.innerHTML="<b>размер скачанного файла</b>";
						
						var newCell = newRow.insertCell(2);
						newCell.width="200";
						newCell.innerHTML="<b>скорость скачивания</b>";
						
						document.body.appendChild(newElem);
												
						var k = 0;//счтёчик закаченных файлов
						(function() {
							if (k < linksToMediaFiles.length) 
							{
								//семафор
								if(loads == false)
								{
									timeStart = Date.now();

									if(linksToMediaFiles[k].indexOf("http://") != -1)
									{
										GetMediaFile(linksToMediaFiles[k]);
									}
									else
									{
										GetMediaFile(pathPlaylist + linksToMediaFiles[k]);
									}
									k++;
								}
								
								setTimeout(arguments.callee, 1000);
							} 
						})();							
					}
					else
					{					
						document.getElementById('info').innerHTML = "Некорректный плейлист/не найден плейлист.";	
					}
				}													
            }
			else
			{
				document.getElementById('info').innerHTML = "Плейлист не найден, пожалуйста, проверьте введённый URL.";
			}
        }
    }

    request.open('GET', link, true); 
    request.send(null); 
}

function GetMediaFile(l) 
{
	loads = true;
    var request = GetXmlHttp();

    request.onreadystatechange = function() 
	{ 
        // onreadystatechange активируется при получении ответа сервера
        if (request.readyState == 4) {
            // если запрос закончил выполняться
            if(request.status == 200) 
			{
				var response = request.responseText;
			
				if(response.length > 0)
				{
					var size = response.length;
					timeStop = Date.now();
					var v = Math.round((size * 8) / ((timeStop - timeStart) / 1000));
					
					var newElem=document.createElement("table");
					var newRow=newElem.insertRow(0);
					
					var newCell = newRow.insertCell(0);
					newCell.width="250";
					newCell.innerHTML="<b>" + countMediaFiles + "</b>";
					
					var newCell = newRow.insertCell(1);
					newCell.width="200";
					newCell.innerHTML="<b>" + size + " байт</b>";
					
					var newCell = newRow.insertCell(2);
					newCell.width="200";
					newCell.innerHTML="<b>" + v + " бит/сек</b>";
					
					document.body.appendChild(newElem);
				}
				loads = false;
				countMediaFiles++;			
            }
			else
			{
				document.getElementById('info').innerHTML = "Плейлист повреждён или отсутствуют медиа-файлы.";
				loads = false;
			}
        }
    }
    request.open('GET', l, true); 
    request.send(null); 
}