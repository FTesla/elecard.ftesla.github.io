<?php 
	$l = $_GET["l"];
	$html = file_get_contents($l);
	
	echo $html;
?>