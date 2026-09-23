// ================================================================ motion (enter / hold / exit)
// Everything is expressed as text-animator Expression Selectors or layer
// transform expressions, so the result stays editable and re-timable in AE.
var JZ_FNS = 'function cl(x){return Math.max(0,Math.min(1,x));}' +
    'function oe(x){x=cl(x);return x>=1?1:1-Math.pow(2,-10*x);}' +
    'function ioe(x){x=cl(x);if(x<=0||x>=1)return x;return x<0.5?Math.pow(2,20*x-10)/2:(2-Math.pow(2,-20*x+10))/2;}' +
    'function oc(x){x=cl(x);return 1-Math.pow(1-x,3);}' +
    'function ic(x){x=cl(x);return x*x*x;}' +
    'function iq(x){x=cl(x);return x*x;}' +
    'function ie(x){x=cl(x);return x<=0?0:Math.pow(2,10*x-10);}' +
    'function ob(x,s){x=cl(x);var c=s+1;return 1+c*Math.pow(x-1,3)+s*Math.pow(x-1,2);}' +
    'function bo(x){x=cl(x);var n=7.5625,d=2.75;if(x<1/d)return n*x*x;if(x<2/d){x-=1.5/d;return n*x*x+0.75;}if(x<2.5/d){x-=2.25/d;return n*x*x+0.9375;}x-=2.625/d;return n*x*x+0.984375;}\n';

function jzHead(ctx, o) {
    var c = ctx.cut;
    return 'var IN=' + jzN(Math.max(0.02, c.inDur || 0.3)) + ',DL=' + jzN((o.mi || 0) * (c.stagger || 0.04)) +
        ',OS=' + jzN(c.dur - (c.outDur || 0)) + ',OD=' + jzN(Math.max(0.001, c.outDur || 0)) + ',DUR=' + jzN(c.dur) +
        ',SD=' + ((c.seed % 99991) + (o.mi || 0) * 101) + ',M=' + jzN(ctx.fx.motion) + ',G=' + jzN(ctx.fx.glitch) + ',SZ=' + jzN(o.size || 100) + ';\n' + JZ_FNS +
        'var P=cl((time-DL)/IN), PO=(OD>0.002?cl((time-OS)/OD):0), AMT=cl((time-DL-IN*0.85)/0.25)*(1-PO);\n';
}

function jzMotion(ctx, L, o) {
    var c = ctx.cut, isText = o.text !== false;
    var en = o.enter || c.enter || 'cut', ex = o.exit || c.exit || 'cut', ho = o.noHold ? 'still' : (c.hold || 'still');
    var size = o.size || 100, W = ctx.W, H = ctx.H;
    var HD = jzHead(ctx, o);
    var parts = { sc: [], pos: [], op: [], rot: [] };
    var seedR = 'seedRandom(textIndex*7919+SD,true);';
    if (!isText) {       // shapes / groups: map to layer-level motion
        if (en !== 'cut') { parts.sc.push('var q=oe(P);f=[f[0]*(q<1?ob(P,2):1),f[1]*(q<1?ob(P,2):1)];'); }
        if (ex !== 'cut') parts.sc.push('f=[f[0]*(1-ic(PO)),f[1]*(1-ic(PO))];');
        parts.op.push('f*=time<DL?0:1;');
    } else {
        // -------- enter
        if (en === 'assemble') {
            var sp = size * 3.2 * (0.6 + ctx.fx.motion * 0.7);
            var core = HD + seedR + 'var dl=random(0,IN*0.45);var x=(time-DL-dl)/(IN*0.62);var k=(1-oe(x))*100;';
            jzAnimator(L, 'JZ In Move', [['ADBE Text Position 3D', [sp, sp, 0]], ['ADBE Text Rotation', 190]], core + 'var a=random(0,Math.PI*2);var r=random(0.35,1);[Math.cos(a)*k*r,Math.sin(a)*k*r,0]');
            jzAnimator(L, 'JZ In Scale', [['ADBE Text Scale 3D', [210, 210, 100]]], core + 'Math.max(-55,Math.min(100,k*random(-0.55,1.1)))');
            jzAnimator(L, 'JZ In Hide', [['ADBE Text Opacity', 0]], core + 'x<0?100:0');
        } else if (en === 'slice') {
            var ww = jzEffect(L, 'ADBE Wave Warp', 'JZ In Slice');
            jzEP(ww, 1, 2); jzEP(ww, 4, 0); jzEP(ww, 5, 0); jzEP(ww, 6, 1);
            jzEX(ww, 2, HD + '(1-oe(P*1.15))*thisComp.width*0.45');
            jzEX(ww, 3, HD + 'posterizeTime(12);seedRandom(SD+Math.floor(time*12),true);random(SZ*0.18,SZ*0.9)');
            jzEX(ww, 7, HD + 'posterizeTime(12);seedRandom(SD+Math.floor(time*12)+3,true);random(0,360)');
        } else if (en === 'type') {
            jzAnimator(L, 'JZ In Type', [['ADBE Text Opacity', 0]], HD + 'textIndex>Math.floor(P*(textTotal+0.999))?100:0');
        } else if (en === 'pop' || en === 'spin') {
            var qs = HD + 'var d=textTotal>1?(textIndex-1)/(textTotal-1)*0.45:0;var q=cl((P-d)/0.55);';
            if (en === 'pop') {
                jzAnimator(L, 'JZ In Pop', [['ADBE Text Scale 3D', [0, 0, 100]]], qs + 'q<=0?100:(1-ob(q,2.6))*100');
                jzAnimator(L, 'JZ In Tilt', [['ADBE Text Rotation', 28]], qs + seedR + '(1-oc(q))*100*random(-1,1)');
            } else {
                jzAnimator(L, 'JZ In Spin', [['ADBE Text Rotation', 200]], qs + seedR + '(1-oe(q))*100*(random()<0.5?-1:1)');
                jzAnimator(L, 'JZ In SpinScale', [['ADBE Text Scale 3D', [15, 15, 100]]], qs + '(1-oe(q))*100');
            }
            jzAnimator(L, 'JZ In Hide', [['ADBE Text Opacity', 0]], qs + 'q<=0?100:0');
        } else if (en === 'drop') {
            var qd = HD + seedR + 'var d=textTotal>1?random(0,0.5):0;var q=cl((P-d)/0.5);';
            jzAnimator(L, 'JZ In Drop', [['ADBE Text Position 3D', [0, -size * 2.4, 0]]], qd + 'q<=0?100:(1-bo(q))*100');
            jzAnimator(L, 'JZ In Hide', [['ADBE Text Opacity', 0]], qd + 'q<=0?100:0');
        } else if (en === 'stretch') {
            parts.sc.push('var e=oe(P);f=[f[0]*(4.2+(1-4.2)*e),f[1]];');
            var db = jzEffect(L, 'ADBE Motion Blur', 'JZ In Streak');
            jzEP(db, 1, 90); jzEX(db, 2, HD + '(1-oe(P))*SZ*0.7');
        } else if (en === 'wipe') {
            var lw = jzEffect(L, 'ADBE Linear Wipe', 'JZ In Wipe');
            jzEP(lw, 2, (c.seed % 2) ? 90 : 270); jzEP(lw, 3, 0);
            jzEX(lw, 1, HD + '100*(1-ioe(P))');
        } else if (en === 'blur') {
            jzAnimator(L, 'JZ In Blur', [['ADBE Text Blur', [26, 26]], ['ADBE Text Opacity', 0], ['ADBE Text Tracking Amount', 60]], HD + '(1-oc(P))*100');
        } else if (en === 'flicker') {
            jzAnimator(L, 'JZ In Flicker', [['ADBE Text Opacity', 0]], HD + 'posterizeTime(12);seedRandom(textIndex*31+SD+Math.floor(time*12)*7,true);P>=1?0:(random()<P*1.25?0:100)');
        } else if (en === 'scramble') {
            jzAnimator(L, 'JZ In Scramble', [['ADBE Text Character Offset', 60]], HD + 'var st=0.25+0.75*(textTotal>1?(textIndex-1)/(textTotal-1):1);posterizeTime(12);seedRandom(textIndex+SD+Math.floor(time*12)*97,true);P>=st?0:random(15,100)');
            jzAnimator(L, 'JZ In Hide', [['ADBE Text Opacity', 0]], HD + 'var st=0.25+0.75*(textTotal>1?(textIndex-1)/(textTotal-1):1);posterizeTime(12);seedRandom(textIndex*3+SD+Math.floor(time*12),true);(P<st*0.25&&random()<0.5)||time<DL?100:0');
        } else if (en === 'zoom') {
            parts.sc.push('var e=oe(P);f=[f[0]*(1.7+(1-1.7)*e),f[1]*(1.7+(1-1.7)*e)];');
            parts.op.push('f*=Math.min(1,P*4);');
            var gb = jzEffect(L, 'ADBE Gaussian Blur 2', 'JZ In Blur');
            jzEX(gb, 1, HD + '(1-oe(P))*14');
        }
        if (en !== 'assemble' && en !== 'type' && en !== 'pop' && en !== 'spin' && en !== 'drop' && en !== 'flicker' && en !== 'scramble') parts.op.push('f*=time<DL?0:1;');
        // -------- hold
        if (ho === 'jitter') {
            var A = size * 0.025 * ctx.fx.motion;
            jzAnimator(L, 'JZ Hold Jitter', [['ADBE Text Position 3D', [A, A, 0]], ['ADBE Text Rotation', 4]], HD + 'posterizeTime(12);seedRandom(textIndex*13+SD+Math.floor(time*12)*7,true);[random(-100,100)*AMT,random(-100,100)*AMT,0]');
        } else if (ho === 'wave') {
            jzAnimator(L, 'JZ Hold Wave', [['ADBE Text Position 3D', [0, size * 0.07, 0]], ['ADBE Text Rotation', 5]], HD + 'var v=Math.sin(time*7+textIndex*0.75)*100*AMT;[v,v,0]');
        } else if (ho === 'drift') {
            parts.pos.push('d=[d[0]+' + ((c.seed % 2) ? 1 : -1) + '*(time/DUR-0.5)*thisComp.width*0.035*M,d[1]];');
            parts.sc.push('f=[f[0]*(1+0.05*time/DUR*M),f[1]*(1+0.05*time/DUR*M)];');
        } else if (ho === 'breathe') {
            parts.sc.push('var b=1+0.035*Math.sin(time*Math.PI*1.8)*AMT;f=[f[0]*b,f[1]*b];');
        } else if (ho === 'glitchtick') {
            var gw = jzEffect(L, 'ADBE Wave Warp', 'JZ Hold Glitch');
            jzEP(gw, 1, 2); jzEP(gw, 4, 0); jzEP(gw, 5, 0); jzEP(gw, 6, 1);
            jzEX(gw, 2, HD + 'posterizeTime(12);seedRandom(SD+Math.floor(time*12),true);random()<0.22*G+0.02?random(0.1,0.35)*SZ*AMT:0');
            jzEX(gw, 3, HD + 'posterizeTime(12);seedRandom(SD+Math.floor(time*12)+5,true);random(SZ*0.2,SZ*0.8)');
        }
        // -------- exit
        if (ex === 'explode' || ex === 'scatter') {
            var big = ex === 'explode' ? Math.max(W, H) * 0.9 * (0.5 + ctx.fx.motion * 0.6) : W * 0.7;
            var xe = HD + 'seedRandom(textIndex*977+SD,true);var dl=random(0,OD*0.3);var x=cl((time-OS-dl)/(OD*0.7));var e=x*x*x;';
            jzAnimator(L, 'JZ Out ' + (ex === 'explode' ? 'Explode' : 'Scatter'), [['ADBE Text Position 3D', [big, big, 0]], ['ADBE Text Rotation', ex === 'explode' ? 260 : 540]],
                xe + 'var mid=(textTotal+1)/2;var dx=(textIndex-mid)/Math.max(1,textTotal)*1.6+random(-0.6,0.6);var dy=random(-1,1);var l=Math.sqrt(dx*dx+dy*dy)+0.0001;var r=random(0.35,1);[dx/l*e*100*r,dy/l*e*100*r,0]');
            jzAnimator(L, 'JZ Out Fade', [['ADBE Text Opacity', 0], ['ADBE Text Scale 3D', [60, 60, 100]]], xe + 'x*x*100');
        } else if (ex === 'fall') {
            var G2 = H * 5.5;
            jzAnimator(L, 'JZ Out Fall', [['ADBE Text Position 3D', [0, H * 1.3, 0]], ['ADBE Text Rotation', 200]],
                HD + seedR + 'var x=time-OS-random(0,OD*0.4);var f=x<=0?0:Math.min(100,0.5*' + jzN(G2) + '*x*x/' + jzN(H * 1.3) + '*100);[random(-1,1)*Math.min(100,Math.max(0,x)*120),f,0]');
        } else if (ex === 'drift') {
            var ds = size * 1.6;
            var xd = HD + 'seedRandom(textIndex*433+SD,true);var x=cl((time-OS-random(0,OD*0.3))/(OD*0.7));var e=iq(x);';
            jzAnimator(L, 'JZ Out Drift', [['ADBE Text Position 3D', [ds, ds, 0]], ['ADBE Text Blur', [18, 18]]], xd + 'var a=random(0,Math.PI*2);[Math.cos(a)*e*100,Math.sin(a)*e*100-30*e,0]');
            jzAnimator(L, 'JZ Out Fade', [['ADBE Text Opacity', 0]], xd + 'e*e*100');
        } else if (ex === 'slice' || ex === 'glitch') {
            var sw = jzEffect(L, 'ADBE Wave Warp', ex === 'slice' ? 'JZ Out Slice' : 'JZ Out Glitch');
            jzEP(sw, 1, 2); jzEP(sw, 4, 0); jzEP(sw, 5, 0); jzEP(sw, 6, 1);
            if (ex === 'slice') jzEX(sw, 2, HD + 'ie(PO)*thisComp.width*0.55');
            else { jzEX(sw, 2, HD + 'posterizeTime(12);seedRandom(SD+Math.floor(time*12)*3,true);PO>0?SZ*(0.3+PO*2.2)*random(0,1):0'); parts.op.push('if(PO>0.55){seedRandom(SD+Math.floor(time*12)*5,true);f*=random()<0.5?0.15:1;} f*=1-cl((PO-0.8)/0.2);'); }
            jzEX(sw, 3, HD + 'posterizeTime(12);seedRandom(SD+Math.floor(time*12)+9,true);random(SZ*0.15,SZ*0.9)');
        } else if (ex === 'wipe') {
            var lw2 = jzEffect(L, 'ADBE Linear Wipe', 'JZ Out Wipe');
            jzEP(lw2, 2, (c.seed % 2) ? 90 : 270); jzEP(lw2, 3, 0);
            jzEX(lw2, 1, HD + '100*ioe(PO)');
        } else if (ex === 'shrink') {
            parts.sc.push('var s2=1-0.96*ic(PO);f=[f[0]*s2,f[1]*s2];'); parts.op.push('f*=1-ic(PO)*ic(PO);');
        } else if (ex === 'blur') {
            jzAnimator(L, 'JZ Out Blur', [['ADBE Text Blur', [30, 30]], ['ADBE Text Opacity', 0]], HD + 'iq(PO)*100');
        } else if (ex === 'stretch') {
            parts.sc.push('var e2=ie(PO);f=[f[0]*(1+5*e2),f[1]*(1-0.4*e2)];'); parts.op.push('f*=1-cl((PO-0.7)/0.3);');
        }
    }
    // compose layer transform expressions
    if (parts.sc.length) jzSetExpr(jzXf(L, 'ADBE Scale'), HD + 'var f=[1,1];' + parts.sc.join('') + '[value[0]*f[0],value[1]*f[1]]');
    if (parts.pos.length) jzSetExpr(jzXf(L, 'ADBE Position'), HD + 'var d=[0,0];' + parts.pos.join('') + '[value[0]+d[0],value[1]+d[1]]');
    if (parts.op.length) jzSetExpr(jzXf(L, 'ADBE Opacity'), HD + 'var f=1;' + parts.op.join('') + 'value*f');
    return L;
}

// simple pop for non-text elements (decor, labels): scale in with overshoot, out with the cut
function jzPop(ctx, L, delay, outToo) {
    var c = ctx.cut;
    var ex = 'var st=' + jzN(delay || 0) + ',du=0.24,OS=' + jzN(c.dur - (c.outDur || 0.15)) + ',OD=' + jzN(Math.max(0.12, c.outDur || 0.15)) + ';' + JZ_FNS +
        'var q=cl((time-st)/du);var s=q<=0?0:ob(q,1.9);' + (outToo !== false ? 's*=1-ic((time-OS)/OD);' : '') + '[value[0]*s,value[1]*s]';
    jzSetExpr(jzXf(L, 'ADBE Scale'), ex);
}
function jzFadeIO(ctx, L, delay, inDur) {
    var c = ctx.cut;
    jzSetExpr(jzXf(L, 'ADBE Opacity'), 'var st=' + jzN(delay || 0) + ',du=' + jzN(inDur || 0.3) + ',OS=' + jzN(c.dur - Math.max(0.12, c.outDur || 0.15)) + ',OD=' + jzN(Math.max(0.12, c.outDur || 0.15)) + ';' + JZ_FNS + 'value*oc((time-st)/du)*(1-ic((time-OS)/OD))');
}
