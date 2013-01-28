var bpharmony = {};
(function(){

	var canvas = document.getElementById('canvas');
	var context = canvas.getContext('2d');
	var width = canvas.width;
	var height = canvas.height;

//background
	var backgroundGradient = context.createRadialGradient(width/2, height/2, 0, width/2, height/2, height/1.1);
	backgroundGradient.addColorStop(0, '#333');
	backgroundGradient.addColorStop(1, '#111');

	var wavetypes = ["saw", "sine", "square", "noise", "synth"];
	var circles = [];
//circle colors
	/*
	var green = 'rgba(50,255,0,1)';
	var lightGreen = 'rgba(150,255,0,1)';
	var lighterGreen = 'rgba(200,255,0,1)';
	var yellow = 'rgba(255,255,0,1)';
	var orange = 'rgba(255,200,0,1)';
	var red = 'rgba(255,0,0,1)';
	*/
	var circlecolor = 'rgba(50,255,0,1)';
	var arroneffects = [false, false, false];
	

	var middleC = 261.6260;
	var waves = ["sine",0.0000,0.0700,0.0000,2.0000,1.0000,1.0000,20.0000,middleC,2400.0000,0.0000,0.0000,0.0000,0.0000,0.0000,0.0000,0.0000,0.0000,0.0000,0.0000,0.0000,0.0000,0.0000,1.0000,0.0000,0.0000,0.0000,0.0000];
	var drawBackground = function(){
		context.globalAlpha = 1.0;
		context.fillStyle = backgroundGradient;
		context.fillRect(0, 0, width, height);
	}	

	
	var drawCircles = function(){

		for(var i=0; i<circles.length; i++){
			/////paint background circles
			var r,g,b,a;

			var ex = circles[i].x, ey = circles[i].y;
			var gradblur = context.createRadialGradient(ex, ey, 0, ex, ey, circles[i].radius+10);
			context.beginPath();

			r = Math.random()*255*1.8;
			g = Math.random()*255*1.8;
			b = Math.random()*255*1.8;

			r = r >> 0;
			g = g >> 0;
			b = b >> 0;
			a = circles[i].alpha;

			var edgecolor3 = "rgba("+r+","+g+","+b+",0.15)";
			var edgecolor4 = "rgba("+r+","+g+","+b+",0)";

			gradblur.addColorStop(0, circles[i].color);
			gradblur.addColorStop(0.9,edgecolor3);
			gradblur.addColorStop(1,edgecolor4);

			context.fillStyle = gradblur;
			context.globalAlpha = circles[i].alpha;
			context.arc(ex, ey, circles[i].radius+10, 0, Math.PI*2, false);
			context.closePath();		
			context.fill();
		
			circles[i].alpha -= 0.01;
			circles[i].radius += 0.5;			
			//circles[i].note.play();
	
			if(circles[i].alpha < 0){
				circles.splice(i, 1);
		
				//initialize circle param
				//circles[i].alpha = 1;
				//circles[i].radius = 1;
				//circles[i].note.play();
			}
			
		}
	}

	var play = function(){
		drawBackground();
		drawCircles();
	}

	var rand = function(min, max){
		return Math.random() * (max-min) + min;
	}

	var scale = function(x, a1, a2, b1, b2){
		return b1 + (x - a1) * (b2 - b1) / (a2 - a1);
	}

	var addCircle = function(x,y){
		var circle = {};
		circle.x = x;
		circle.y = y;
		circle.radius = 1;

		circle.color = circlecolor;		
		circle.noteParams = waves;
		var noteparams = circle.noteParams;

		//set notes
		if(y < height/6){
			noteparams[8] = middleC*6;
		}else if(y <2*height/6){
			noteparams[8] = middleC*5;
		}else if(y <3*height/6){
			noteparams[8] = middleC*4;
		}else if(y <4*height/6){
			noteparams[8] = middleC*3;
		}else if(y <5*height/6){
			noteparams[8] = middleC*2;
		}else{
			noteparams[8] = middleC;
		}

		//set filters
		var delta_slide = scale(x, 0, width, -0.4, 0.4);	
		var vibrato_depth = scale(x, 0, width, 0, 1);
		var vibrato_frequency = scale(x, 0, width, 0.01, 47.95);
		var vibrato_depthslide = scale(x, 0, width, 0, 1);
		var vibrato_frequencyslide = scale(x, 0, width, -1, 1);
		var phasor_offset = scale(x, 0, width, -1, 1);
		var phasor_sweep = scale(x, 0, width, -1, 1);

		

		//slide effect
		if(arroneffects[0]){
			noteparams[11] = delta_slide;
		}else{	
			noteparams[11] = 0.0000;
		}

		//vibrato
		if(arroneffects[1]){
			noteparams[12] = vibrato_depth;
			noteparams[13] = vibrato_frequency;
			noteparams[14] = vibrato_depthslide;
			noteparams[15] = vibrato_frequencyslide;
		}else{
			noteparams[12] = 0.0000;
			noteparams[13] = 0.0000;
			noteparams[14] = 0.0000;
			noteparams[15] = 0.0000;
		}	

		//phasor
		if(arroneffects[2]){
			noteparams[21] = phasor_offset;
			noteparams[22] = phasor_sweep;		
		}else{
			noteparams[21] = 0.0000;
			noteparams[22] = 0.0000;
		}

		circle.alpha = 1.0;

		emitTone(circle);
	}

	var createSound = function(noteParams){
		//create the sound
		var params = jsfxlib.arrayToParams(noteParams);
		var data = jsfx.generate(params);
		return audio.make(data);
	}

	var mouseUpHandler = function(event){
		var x;
		var y;

		if(event.pageX || event.pageY){
			x = event.pageX;
			y = event.pageY;
		}else{
			x = event.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
			y = event.clientY + document.body.scrollTop + document.documentElement.scrollTop;
		}

		x -= canvas.offsetLeft;
		y -= canvas.offsetTop;

		addCircle(x, y);
	}

	this.changeWaveType = function(arrcolors){
		
		var uniqidx = arrcolors[0].t;
		var uniqcolor = arrcolors[0].c;
		var r,g,b;
		for(c in arrcolors){
			if(arrcolors[c].t==1){
				r = arrcolors[c].c;
			}else if(arrcolors[c].t==2){
				g = arrcolors[c].c;
			}else if(arrcolors[c].t==3){
				b = arrcolors[c].c;
			}
		}
		circlecolor = 'rgba('+r+','+g+','+b+', 1)'; 

		if(uniqcolor < 100){
			//make noise
			waves[0] = wavetypes[3];
			waves[2] = 0.02;
		}else{
			if(uniqidx==1){	
				waves[0] = wavetypes[0];
				waves[2] = 0.025;
			}else if(uniqidx==2){
				waves[0] = wavetypes[1];			
			}else{
				waves[0] = wavetypes[4];
				waves[2] = 0.04;
			}
		}
	}

	this.init = function(){
		canvas.addEventListener("mouseup", mouseUpHandler, false);

//begin and rebegin
		var frameRate = 30;
		var intervalTime = 1000/frameRate;
		setInterval( play, intervalTime);
	}

	this.setEffects = function(arr){
		arroneffects = arr;
	}

	this.pushCircle = function(circle){
		circle.note = createSound(circle.noteParams);
		circle.note.play();
		circles.push(circle);
	}

}).apply(bpharmony);

