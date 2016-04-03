<?php 
	$l = $_GET["l"];
	
	$start = microtime(true);
	$ts = file_get_contents($l);
	$time = microtime(true) - $start;
	
	$size = strlen($ts);
	
	$v = round($size/$time*8);
	
	echo $size.':'.$v;
?>