onmessage = function(entityName){	
	var xhr = new XMLHttpRequest();
	xhr.open("GET", "/getPopularity?entityName=" + encodeURIComponent(entityName.data), true);
	xhr.onload = function (e) {
	  if (xhr.readyState === 4) {
	    if (xhr.status === 200) {
	      console.log(xhr.responseText);
	      postMessage(xhr.responseText);
	    } else {
	      console.error(xhr.statusText);
	    }
	  }
	};
	xhr.onerror = function (e) {
	  console.error(xhr.statusText);
	};
	xhr.send(null);
}