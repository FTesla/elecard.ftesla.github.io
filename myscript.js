var dir_home = "";
var loads = false;
var count_ts = 1;
	
	
function newf() 
{
	$.ajax({
     url:"http://qthttp.apple.com.edgesuite.net/1010qwoeiuryfg/sl.m3u8",
     dataType: 'jsonp', // Notice! JSONP <-- P (lowercase)
     success:function(json){
         // do stuff with json (in this case an array)
         alert("Success");
     },
     error:function(){
         alert("Error");
     }      
	});
	
	/*$.ajax({
	url: "http://devimages.apple.com/iphone/samples/bipbop/bipbopall.m3u8",
	success: function(data)
	{
		alert( "Прибыли данные: " + data );
	}
	});*/
}	
	
	
function getXmlHttp()
{
	var xmlhttp;
	try 
	{
		xmlhttp = new ActiveXObject("Msxml2.XMLHTTP");
	} catch (e) {
    try {
      xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
    } catch (E) {
      xmlhttp = false;
    }
	}
	if (!xmlhttp && typeof XMLHttpRequest!='undefined') {
	xmlhttp = new XMLHttpRequest();
	}
	return xmlhttp;
}

	
function f1() 
{
	if(document.getElementById('pl').value.length > 0)
	{
		count_ts = 1;
		//получить директорию
		var home = document.getElementById('pl').value;
		while(home.charAt(home.length - 1) != "/")
		{
			home = home.substring(0, home.length - 1);
		}
		dir_home = home;
		
		var req = getXmlHttp();
		req.onreadystatechange = function() 
		{ 
			
			// onreadystatechange активируется при получении ответа сервера
			if (req.readyState == 4) {
				// если запрос закончил выполняться
				if(req.status == 200) 
				{
					var response = req.responseText;
				
					if(response.length > 0)
					{
						if(response.indexOf("#EXT-X-STREAM-INF") != -1)
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
							var str = "";
							var BW = new Array();
							var link = new Array();
							var x = 0;
							for (var j = 0; j < a.length; j++) 
							{
								//найден файл в плейлисте
								if(a[j].indexOf("#EXT-X-STREAM-INF") != -1)
								{
									var str_temp = "";
									a[j] = a[j].substr(a[j].indexOf("BANDWIDTH=") + 10);
									if(a[j].indexOf(",") != -1) 
									{
										a[j] = a[j].substr(0, a[j].indexOf(","));
									}
									
									BW[x] = parseInt(a[j],10);
									j++;
									if(a[j].length == 0) j++;
									link[x] = a[j];
									
									str += BW[x] + "<br>" + link[x] + "<br>";
									x++;
								}				
							}
							
							//поиск максимального качества
							var max_index = 0;
							if(BW.length > 0)
							{					
								for (var k = 1; k < BW.length; k++) 
								{
									if(BW[k] > BW[max_index]) max_index = k;
								}
							}
							
							if(link[max_index].indexOf("http://") != -1)
							{
								f2(link[max_index]);
							}
							else
							{
								f2(dir_home + link[max_index]);
							}
						}
						else
						{
							if(response.indexOf("#EXTINF") != -1)
							{
								f2(document.getElementById('pl').value);
							}
						}
					}													
				}
				else
				{
					document.getElementById('info').innerHTML = "Ответ сервера: " + "error";
				}
			}
		}

		req.open('GET',"/playlist.php?l=" + document.getElementById('pl').value, true); 

		req.send(null); 
	}

}


function f2(l) 
{
	var home = l;
	while(home.charAt(home.length - 1) != "/")
	{
		home = home.substring(0, home.length - 1);
	}
	dir_home = home;
	
    var req = getXmlHttp();

    req.onreadystatechange = function() 
	{ 
		
        // onreadystatechange активируется при получении ответа сервера
        if (req.readyState == 4) {
            // если запрос закончил выполняться
            if(req.status == 200) 
			{
				var response = req.responseText;
			
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
						var str = "";
						var links = new Array();
						var x = 0;
						for (var j = 0; j < a.length; j++) 
						{
							//найден файл в плейлисте
							if(a[j].indexOf("#EXTINF") != -1)
							{
								j++;
								links[x] = a[j];
								x++;
							}				
						}
																																	
						document.getElementById('info').innerHTML = "Количество TS файлов в плейлисте: " + links.length;
						
						
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
						
						
						var k = 0;
						(function() {
							if (k < links.length) 
							{
								if(loads == false)
								{
									if(links[k].indexOf("http://") != -1)
									{
										f3(links[k]);
									}
									else
									{
										f3(dir_home + links[k]);
									}
									k++;
								}
								
								setTimeout(arguments.callee, 1000);
							} 
						})();
						
											
					}
					else
					{					
						document.getElementById('info').innerHTML = "некорректный плейлист/не найден плейлист";	
					}
				}													
            }
			else
			{
				document.getElementById('info').innerHTML = "Ответ сервера: " + "error";
			}
        }
    }

    req.open('GET', "/playlist.php?l=" + l, true); 

    req.send(null); 


}

function f3(l) 
{
	loads = true;
    var req = getXmlHttp();

    req.onreadystatechange = function() 
	{ 
		
        // onreadystatechange активируется при получении ответа сервера
        if (req.readyState == 4) {
            // если запрос закончил выполняться
            if(req.status == 200) 
			{
				var response = req.responseText;
			
				if(response.length > 0)
				{
					var size = "";
					var v = "";
					
					size = response.substr(0,response.indexOf(':'));				
					v = response.substr(response.indexOf(':') + 1);
					
					
					var newElem=document.createElement("table");
					var newRow=newElem.insertRow(0);
					
					var newCell = newRow.insertCell(0);
					newCell.width="250";
					newCell.innerHTML="<b>" + count_ts + "</b>";
					
					var newCell = newRow.insertCell(1);
					newCell.width="200";
					newCell.innerHTML="<b>" + size + " байт</b>";
					
					var newCell = newRow.insertCell(2);
					newCell.width="200";
					newCell.innerHTML="<b>" + v + " бит/сек</b>";
					
					document.body.appendChild(newElem);
				}	
				loads = false;
				count_ts++;
            }
			else
			{
				document.getElementById('info').innerHTML = "Ответ сервера: " + "error";
				loads = false;
			}
        }
    }

    req.open('GET', "/get_ts.php?l=" + l, true); 

    req.send(null); 
}