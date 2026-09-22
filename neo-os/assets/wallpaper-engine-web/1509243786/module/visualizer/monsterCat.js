////////////////////////////////////////
// Created By Kahool                 //
// Remake By FLomka for CWAV Engine //
// Powered By RedFox               //
////////////////////////////////////

let canvasz = document.createElement('canvas')
canvasz.id = "monstercat"
document.querySelector('.app').append(canvasz)
var ctxz = canvasz.getContext("2d");

var bars = [];
var barsLength = 128;
var peakValue = 1;
var smoothingFactor = 2;
var mCat = {
    barWidth: 20,
    barPadding: 5,
    colour: "#fff",
    smoothingFactor: 5,
    equalize: true,
    fps: 120,
    reverse: false,
    double: false
};

//Thanks to Squee
var pinknoise = [1.1760367470305, 0.85207379418243,0.68842437227852,0.63767902570829,0.5452348949654,0.50723325864167,0.4677726234682,0.44204182748767,
    0.41956517802157,0.41517375040002,0.41312118577934,0.40618363960446,0.39913707474975,0.38207008614508,0.38329789106488,0.37472136606245,
    0.36586428412968,0.37603017335105,0.39762590761573,0.39391828858591,0.37930603769622,0.39433365764563,0.38511504613859,0.39082579241834,
    0.3811852720504,0.40231453727161,0.40244151133175,0.39965366884521,0.39761103827545,0.51136400422212,0.66151212038954,0.66312205226679,
    0.7416276690995,0.74614971301133,0.84797007577483,0.8573583910469,0.96382997811663,0.99819377577185,1.0628692615814,1.1059083969751,
    1.1819808497335,1.257092297208,1.3226521464753,1.3735992532905,1.4953223705889,1.5310064942373,1.6193923584808,1.7094805527135,
    1.7706604552218,1.8491987941428,1.9238418849406,2.0141596921333,2.0786429508827,2.1575522518646,2.2196355526005,2.2660112509705,
    2.320762171749,2.3574848254513,2.3986127976537,2.4043566176474,2.4280476777842,2.3917477397336,2.4032522546622,2.3614180150678  ];


var last = performance.now() / 1000;
var fpsThreshold = 0;


function monstercateq(audioData) {
    var max = 0;
    var data = [];
    for( i = 0; i < 64; i++ ) {
        data.push((audioData[i]+audioData[i+64])/2)
        if(mCat.equalize) {
            data[i] /= pinknoise[i];
        }
        if(data[i] > max) {
            max = data[i];
        }
    }

    peakValue = peakValue * 0.99 + max*0.01; 
    for(i = 0; i < data.length; i++ ) {
        data[i] /= peakValue;
        if(data[i] > 1.1) {
            data[i] = 1.1;
        }
    }
    var newAudio = [];
    var average = 0;
    if (mCat.double) for(var i = 0; i < 64; i++) {
        if(i == 0 || i == 63) {
            newAudio[i] = data[i];
            newAudio[127-i] = data[i];
        } else {
            newAudio[i] = (data[i-1]*2+data[i]*3+data[i+1]*2)/7;
            newAudio[127-i] = (data[i-1]*2+data[i]*3+data[i+1]*2)/7;
        }
        if (mCat.reverse) {
            newAudio[i] *= -1
            newAudio[127-i] *= -1
        }
        average+=newAudio[i];
    }
    else for(var i = 0; i < 128; i++) {
        if(i == 32 || i == 94) {
            newAudio[i] = data[i-32];
        } 
        else if(i < 32 || i > 94) {
            newAudio[i] = 0;
        }
        else {
            newAudio[i] = (data[i-33]*2+data[i-32]*3+data[i-31]*2)/7;
        }
        if (mCat.reverse) {
            newAudio[i] *= -1
        }
        average+=newAudio[i];
    }
    average /= 64;
    for(var i = 0; i < bars.length; i++) {
        bars[i].desiredPos = newAudio[i]*canvasz.height/3;
    } 
};

function UpdateSize() {
    for(var i = 0; i < bars.length; i++) {
        bars[i].x = canvasz.width/2-(barsLength*(mCat.barWidth+mCat.barPadding))/2+i*(mCat.barWidth+mCat.barPadding)
        bars[i].y = canvasz.height/2-25
        bars[i].width = mCat.barWidth
        bars[i].height = 0
    }
}

function resize() {
    canvasz.width = window.innerWidth;
    canvasz.height = window.innerHeight;
    canvasz.style.width = window.innerWidth + "px";
    canvasz.style.height = window.innerHeight + "px";
}

function Bar(x,y,width,height,colour) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.desiredPos = this.height;
    this.draw = function() {
        ctxz.fillRect(this.x, this.y, this.width, this.height);
    }
    this.update = function() {
        if(this.height < this.desiredPos) {
            this.height+=(this.desiredPos-this.height)/mCat.smoothingFactor;
        } else if(this.height > this.desiredPos) {
            this.height-=(this.height-this.desiredPos)/mCat.smoothingFactor;
        }
        this.y = canvasz.height/2-this.height;
    }
}

onload();

function onload() {
    resize();
    for(var i = 0; i < barsLength; i++) {
        bars.push(new Bar(canvasz.width/2-(barsLength*(mCat.barWidth+mCat.barPadding))/2+i*(mCat.barWidth+mCat.barPadding),canvasz.height/2-25,mCat.barWidth,25))
    }
    window.requestAnimationFrame(draw);
}

function draw() {
    window.requestAnimationFrame(draw);
    var now = performance.now() / 1000;
    var dt = Math.min(now - last, 1);
    last = now;

    if (mCat.fps > 0) {
        fpsThreshold += dt;
        if (fpsThreshold < 1.0 / mCat.fps) {
            return;
        }
        fpsThreshold -= 1.0 / mCat.fps;
    }

    ctxz.clearRect(0,0,canvasz.width, canvasz.height);
    ctxz.fillStyle=mCat.colour;
    for(var i = 0; i < bars.length; i++) {
        bars[i].draw();
        bars[i].update();
    }
}