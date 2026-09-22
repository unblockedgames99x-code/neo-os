/**
 * Created by FLomka on 2018/12/23.
 *
 * User settings for .
 **/
// var date = new Clock('.app')

var clockSettingsObject = {};
var clock_settings = function(settings) {
	if(settings.showTime){
        //oClocks.style.display = settings.showTime.value ? 'block' : 'none';
        clockSettingsObject.show = settings.showTime.value
        if(!clockSettingsObject.show) SetTypeClock(99)
            else SetTypeClock(clockSettingsObject.type)
    }
    if(settings.timeType){
        clockSettingsObject.type = settings.timeType.value
        if(clockSettingsObject.show) SetTypeClock(clockSettingsObject.type)
    }
    if(settings.tAlignment){
        clockSettingsObject.align = settings.tAlignment.value
        oClock.style.textAlign = clockSettingsObject.align
        clockSettingsObject.alignPX = settings.tAlignment.value == 'left' ? 40 : settings.tAlignment.value == 'right' ? -40 : 0
        oClock.style.left = TimeX-50+clockSettingsObject.alignPX+'%';
    }
    if (settings.clockFont) {
        if (isNaN(settings.clockFont.value) && settings.clockFont.value) {
            SetFont(settings.clockFont.value)
            oClock.style.fontFamily = settings.clockFont.value.replace(/:/g, ' ') + ", sans-serif"
        }
        else SetOldFontClock(settings.clockFont.value)
    }
    if (settings.clockFontDir) {
        if (settings.clockFontDir.value) {
            oClock.style.fontFamily = "'Custom-eV', sans-serif"
            SetFontCustom(settings.clockFontDir.value, 'Custom-eV')
        }
    }
	if(settings.tShowSencends){
        tShowSencends = settings.tShowSencends.value
    }
	if(settings.tSize){
        var s = settings.tSize.value
        oClock.style.fontSize = Math.floor(h/300*s) + 'px'
        oGlitch_clock.style.fontSize = Math.floor(h/300*s) + 'px'
        document.body.style.setProperty('--digit_size3', (s / 5)+'vmin')
        document.body.style.setProperty('--digit_size2', (s/ 2.5)+'vmin')
        document.body.style.setProperty('--digit_size', (s / 100)+'vmax')
        document.body.style.setProperty('--digit_size1', (s / 50)+'vmax')
        document.body.style.setProperty('--slide_size', mathMap(s,0,50,10,100)+'px')
    }
    if(settings.TimeColorRhythm){
        TimeColorRhythm = settings.TimeColorRhythm.value;
		if(!TimeColorRhythm){
			oClock.style.color = TimeColor;
            oClock.style.textShadow = TimeBlurColor;
            oSlide_enable.style.color = TimeColor;
			oSlide_enable.style.textShadow = TimeBlurColor;
            document.body.style.setProperty('--glith_color', TimeColor);
		}
    }
    if(settings.TimeColor){
        var c = settings.TimeColor.value.split(' ').map(function(c){return Math.ceil(c*255)});
        oClock.style.color = TimeColor = 'rgb('+c+')';
        oSlide_enable.style.color = TimeColor = 'rgb('+c+')';
        document.body.style.setProperty('--glith_color', TimeColor);
        document.body.style.setProperty('--digit_color', TimeColor);
    }
    if(settings.TimeBlurColor){
        var c = settings.TimeBlurColor.value.split(' ').map(function(c){return Math.ceil(c*255)});
        oClock.style.textShadow = TimeBlurColor = '0 0 10px rgb('+c+')';
        oSlide_enable.style.textShadow = '1px 1px 0px rgb('+c+')';
        clockSettingsObject.blur = 'rgb('+c+')';
        document.body.style.setProperty('--digit_blur', clockSettingsObject.blur);
    }
    if(settings.tStyle){
        tStyle = settings.tStyle.value;
        getTime();
    }
	if(settings.tDotSec){
		timeDot = settings.tDotSec.value;
	}
	if(settings.tDotSec2){
        timeDot2 = settings.tDotSec2.value;
    }
    if(settings.GlitchBG){
        GlitchBG = settings.GlitchBG.value;
        shouldShow()
    }
    if(settings.tX){
        TimeX = settings.tX.value;
        oClock.style.left = TimeX-50+clockSettingsObject.alignPX+'%';
        oClock_glitch.style.left = TimeX-50+'%';
        oDigital_enable.style.marginLeft = TimeX-50+'%';
        oSlide_enable.style.marginLeft = mathMap(TimeX,0,100,-100,100)+'%'
        document.body.style.setProperty('--glith_pos', TimeX + (TimeX*(((window.innerWidth / 64)/100)*2)) - (window.innerWidth / 64)+'% '+(TimeY - (TimeY*0.04) +2)+'%');
    }
    if(settings.tY){
        TimeY = settings.tY.value;
        oClock.style.top = TimeY+'%';
        oClock_glitch.style.top = TimeY-50+'%';
        oSlide_enable.style.marginTop = mathMap(TimeY,0,100,-30,30)+'%'
        oDigital_enable.style.marginTop = mathMap(TimeY,0,100,-30,30)+'%'
        document.body.style.setProperty('--glith_pos', TimeX + (TimeX*(((window.innerWidth / 64)/100)*2)) - (window.innerWidth / 64)+'% '+(TimeY - (TimeY*0.04) +2)+'%');
    }
	if(settings.timetransparency){
        timetransparency = settings.timetransparency.value/100;
        oClock.style.opacity = timetransparency;
        oGlitch_clock.style.opacity = timetransparency;
        oDigital_enable.style.opacity = timetransparency;
    }
    if(settings.tShowSencends){
        tShowSencends = settings.tShowSencends.value;
    }
}

function SetTypeClock(type) {
    switch (type){
            case 99:
                oClock.style.display = 'none';
                oClock_glitch.style.display = 'none';
                oDigital_enable.style.display = 'none';
                oSlide_enable.style.display = 'none';
                break;
            case 1:
                oClock.style.display = 'block';
                oClock_glitch.style.display = 'none';
                oDigital_enable.style.display = 'none';
                oSlide_enable.style.display = 'none';
                break;
            case 2:
                oClock.style.display = 'none';
                oClock_glitch.style.display = 'block';
                oDigital_enable.style.display = 'none';
                oSlide_enable.style.display = 'none';
                setTimeout(second_passed, 2000)
                break;
            case 3:
                oClock.style.display = 'none';
                oClock_glitch.style.display = 'none';
                oDigital_enable.style.display = 'flex';
                oSlide_enable.style.display = 'none';
                break;
            case 4:
                oClock.style.display = 'none';
                oClock_glitch.style.display = 'none';
                oDigital_enable.style.display = 'none';
                oSlide_enable.style.display = 'block';
                break;
            default:
        }
}