/**
 * Created by FLomka on 2020/06/15.
 *
 * User settings for note.
 **/
var note = new Note('.app')

var note_settings = function(settings) {
	if(settings.noteShow) {
		note.loadEx(!settings.noteShow.value)
		note.getStyle().display = settings.noteShow.value ? 'block' : 'none'
	}
	if(settings.noteInner) {
		note.setText(settings.noteInner.value)
	}
	if (settings.noteFont) {
		SetFont(settings.noteFont.value)
		note.getStyle().fontFamily = settings.noteFont.value.replace(/:/g, ' ')
	}
	if (settings.noteFontDir) {
		if (settings.noteFontDir.value) {
			note.getStyle().fontFamily = "'Custom-7b', sans-serif"
			SetFontCustom(settings.noteFontDir.value, 'Custom-7b')
		}
	}
	if(settings.noteSize){
		note.getStyle().fontSize = Math.floor(window.height/600*settings.noteSize.value) + 'px';
	}
	if(settings.noteAlignment){
		note.setAlign(settings.noteAlignment.value)
	}
	if(settings.noteX){
		note.setX(settings.noteX.value)
	}
	if(settings.noteY){
		note.setY(settings.noteY.value)
	}
	if(settings.noteColor){
		note.setVar('color','rgb('+settings.noteColor.value.split(' ').map(function(c){return Math.ceil(c*255)})+')')
	}
	if(settings.noteColorType){
		note.setVar('color_type',settings.noteColorType.value)
	}
	if(settings.noteColorBlur){
		note.setVar('color_blur','rgb('+settings.noteColorBlur.value.split(' ').map(function(c){return Math.ceil(c*255)})+')')
	}
	if(settings.noteColorBlurType){
		note.setVar('color_blur_type',settings.noteColorBlurType.value)
	}
	if(settings.noteTransparency){
		note.getStyle().opacity = settings.noteTransparency.value/100
	}
}