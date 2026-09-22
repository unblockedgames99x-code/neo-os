/**
 * Created by FLomka on 2018/12/23.
 **/
const snow_s = document.createElement('div')
snow_s.id = "snow_s"
document.querySelector('.app').append(snow_s)
var first = true

function snow_sign(dates) {
	if (dates.getDate() == 31 && dates.getMonth() == 11) {
	 	if (dates.getHours() < 23 && current_lang == "ru-ru") snow_s.innerHTML = "До Нового Года осталось " + (24 - dates.getHours()) + " ч"; //to go until the New Year
	 	if (dates.getHours() < 23 && current_lang != "ru-ru") snow_s.innerHTML = (24 - dates.getHours()) + " hours " + " to go until the New Year";
		if (dates.getHours() == 23 && current_lang == "ru-ru") snow_s.innerHTML = "До Нового Года осталось " + (60 - dates.getMinutes()) + " мин"; //to go until the New Year
	 	if (dates.getHours() == 23 && current_lang != "ru-ru") snow_s.innerHTML = (60 - dates.getMinutes()) + " minutes " + " to go until the New Year";
	 	if (dates.getHours() == 23 && dates.getMinutes() == 59 && first == true) {
	 		first = false;
	 		snow_s.style.top = 42 + "%";
	 		snow_s.style.left = 9 + "%";
	 		snow_s.style.fontSize = 650 + "%";
	 	}
	 	if (dates.getHours() == 23 && dates.getMinutes() == 59 && current_lang == "ru-ru") snow_s.innerHTML = "До Нового Года осталось " + (60 - dates.getSeconds()) + " сек"; //to go until the New Year
	 	if (dates.getHours() == 23 && dates.getMinutes() == 59 && current_lang != "ru-ru") snow_s.innerHTML = (60 - dates.getSeconds()) + " seconds " + " to go until the New Year";
	}
	if (dates.getDate() == 1 && dates.getMonth() == 0 && dates.getHours() == 0) {
		snow_s.style.left = 30 + "%";
		if (dates.getMinutes() <= 2 && current_lang == "ru-ru") snow_s.innerHTML = "С Новым Годом!";
		else if (dates.getMinutes() <= 2 && current_lang != "ru-ru") snow_s.innerHTML = "Happy New Year!";
		if (dates.getMinutes() > 2) snow_s.style.display = "none"
	}
}