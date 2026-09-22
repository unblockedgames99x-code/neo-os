/**
 * Created by FLomka on 2018/12/23.
 *
 * User settings for visualizer MonsterCat.
 **/

var monsterCatSettingsObject = {};
var monsterCat_settings = function(settings) {
	if(settings.monstercat_color){
        mCat.customColour = settings.monstercat_color.value
        if(mCat.customColour) {
                var colour = settings.monstercat_color.value.split(' ');
                for(var i = 0; i < colour.length; i++) {
                
                    colour[i] = (colour[i] * 255).toString(16);
                    if(colour[i].length == 1) {
                        colour[i] = "0" + colour[i];
                    }
                }
                colour = colour.join("");
                colour = "#" + colour;
                mCat.colour = colour;
            }
    }
    if(settings.monstercat_smoothing){
        mCat.smoothingFactor = settings.monstercat_smoothing.value
    }
    if(settings.monstercat_barWidth){
        mCat.barWidth = settings.monstercat_barWidth.value
        UpdateSize();
    }
    if(settings.monstercat_barPadding){
        mCat.barPadding = settings.monstercat_barPadding.value
        UpdateSize();
    }
    if(settings.monstercat_opacity){
        canvasz.style.opacity = settings.monstercat_opacity.value/100
        UpdateSize();
    }
    if(settings.monstercat_xPos){
        monsterCat_settings.xPos = settings.monstercat_xPos.value
        canvasz.style.left = monsterCat_settings.xPos - 50 + '%'
    }
    if(settings.monstercat_yPos){
        monsterCat_settings.yPos = settings.monstercat_yPos.value
        canvasz.style.top = monsterCat_settings.yPos - 50 + '%'
    }
    if(settings.monstercat_double){
        mCat.double = settings.monstercat_double.value
    }
    if(settings.monstercat_reverse){
        mCat.reverse = settings.monstercat_reverse.value
    }
}