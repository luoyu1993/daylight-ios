/*
 (c) 2011-2015, Vladimir Agafonkin
 SunCalc is a JavaScript library for calculating sun/moon position and light phases.
 https://github.com/mourner/suncalc
 */

(function () { 'use strict';

 // shortcuts for easier to read formulas

 var PI   = Math.PI,
 sin  = Math.sin,
 cos  = Math.cos,
 tan  = Math.tan,
 asin = Math.asin,
 atan = Math.atan2,
 acos = Math.acos,
 rad  = PI / 180;

 // sun calculations are based on http://aa.quae.nl/en/reken/zonpositie.html formulas


 // date/time constants and conversions

 var dayMs = 1000 * 60 * 60 * 24,
 J1970 = 2440588,
 J2000 = 2451545;

 function toJulian(date) { return date.valueOf() / dayMs - 0.5 + J1970; }
 function fromJulian(j)  { return new Date((j + 0.5 - J1970) * dayMs); }
 function toDays(date)   { return toJulian(date) - J2000; }


 // general calculations for position

 var e = rad * 23.4397; // obliquity of the Earth

 function rightAscension(l, b) { return atan(sin(l) * cos(e) - tan(b) * sin(e), cos(l)); }
 function declination(l, b)    { return asin(sin(b) * cos(e) + cos(b) * sin(e) * sin(l)); }

 function azimuth(H, phi, dec)  { return atan(sin(H), cos(H) * sin(phi) - tan(dec) * cos(phi)); }
 function altitude(H, phi, dec) { return asin(sin(phi) * sin(dec) + cos(phi) * cos(dec) * cos(H)); }

 function siderealTime(d, lw) { return rad * (280.16 + 360.9856235 * d) - lw; }

 function astroRefraction(h) {
 if (h < 0) // the following formula works for positive altitudes only.
 h = 0; // if h = -0.08901179 a div/0 would occur.

 // formula 16.4 of "Astronomical Algorithms" 2nd edition by Jean Meeus (Willmann-Bell, Richmond) 1998.
 // 1.02 / tan(h + 10.26 / (h + 5.10)) h in degrees, result in arc minutes -> converted to rad:
 return 0.0002967 / Math.tan(h + 0.00312536 / (h + 0.08901179));
 }

 // general sun calculations

 function solarMeanAnomaly(d) { return rad * (357.5291 + 0.98560028 * d); }

 function eclipticLongitude(M) {

 var C = rad * (1.9148 * sin(M) + 0.02 * sin(2 * M) + 0.0003 * sin(3 * M)), // equation of center
 P = rad * 102.9372; // perihelion of the Earth

 return M + C + P + PI;
 }

 function sunCoords(d) {

 var M = solarMeanAnomaly(d),
 L = eclipticLongitude(M);

 return {
 dec: declination(L, 0),
 ra: rightAscension(L, 0)
 };
 }


 var SunCalc = {};


 // calculates sun position for a given date and latitude/longitude

 SunCalc.getPosition = function (date, lat, lng) {

 var lw  = rad * -lng,
 phi = rad * lat,
 d   = toDays(date),

 c  = sunCoords(d),
 H  = siderealTime(d, lw) - c.ra;

 return {
 azimuth: azimuth(H, phi, c.dec),
 altitude: altitude(H, phi, c.dec)
 };
 };


 // sun times configuration (angle, morning name, evening name)

 var times = SunCalc.times = [
                              [-0.833, 'sunrise',       'sunset'      ],
                              [  -0.3, 'sunriseEnd',    'sunsetStart' ],
                              [    -6, 'dawn',          'dusk'        ],
                              [   -12, 'nauticalDawn',  'nauticalDusk'],
                              [   -18, 'nightEnd',      'night'       ],
                              [     6, 'goldenHourEnd', 'goldenHour'  ]
                              ];

 // adds a custom time to the times config

 SunCalc.addTime = function (angle, riseName, setName) {
 times.push([angle, riseName, setName]);
 };


 // calculations for sun times

 var J0 = 0.0009;

 function julianCycle(d, lw) { return Math.round(d - J0 - lw / (2 * PI)); }

 function approxTransit(Ht, lw, n) { return J0 + (Ht + lw) / (2 * PI) + n; }
 function solarTransitJ(ds, M, L)  { return J2000 + ds + 0.0053 * sin(M) - 0.0069 * sin(2 * L); }

 function hourAngle(h, phi, d) { return acos((sin(h) - sin(phi) * sin(d)) / (cos(phi) * cos(d))); }

 // returns set time for the given sun altitude
 function getSetJ(h, lw, phi, dec, n, M, L) {

 var w = hourAngle(h, phi, dec),
 a = approxTransit(w, lw, n);
 return solarTransitJ(a, M, L);
 }


 // calculates sun times for a given date and latitude/longitude

 SunCalc.getTimes = function (date, lat, lng) {

 var lw = rad * -lng,
 phi = rad * lat,

 d = toDays(date),
 n = julianCycle(d, lw),
 ds = approxTransit(0, lw, n),

 M = solarMeanAnomaly(ds),
 L = eclipticLongitude(M),
 dec = declination(L, 0),

 Jnoon = solarTransitJ(ds, M, L),

 i, len, time, Jset, Jrise;


 var result = {
 solarNoon: fromJulian(Jnoon),
 nadir: fromJulian(Jnoon - 0.5)
 };

 for (i = 0, len = times.length; i < len; i += 1) {
 time = times[i];

 Jset = getSetJ(time[0] * rad, lw, phi, dec, n, M, L);
 Jrise = Jnoon - (Jset - Jnoon);

 result[time[1]] = fromJulian(Jrise);
 result[time[2]] = fromJulian(Jset);
 }

 return result;
 };


 // moon calculations, based on http://aa.quae.nl/en/reken/hemelpositie.html formulas

 function moonCoords(d) { // geocentric ecliptic coordinates of the moon

 var L = rad * (218.316 + 13.176396 * d), // ecliptic longitude
 M = rad * (134.963 + 13.064993 * d), // mean anomaly
 F = rad * (93.272 + 13.229350 * d),  // mean distance

 l  = L + rad * 6.289 * sin(M), // longitude
 b  = rad * 5.128 * sin(F),     // latitude
 dt = 385001 - 20905 * cos(M);  // distance to the moon in km

 return {
 ra: rightAscension(l, b),
 dec: declination(l, b),
 dist: dt
 };
 }

 SunCalc.getMoonPosition = function (date, lat, lng) {

 var lw  = rad * -lng,
 phi = rad * lat,
 d   = toDays(date),

 c = moonCoords(d),
 H = siderealTime(d, lw) - c.ra,
 h = altitude(H, phi, c.dec),
 // formula 14.1 of "Astronomical Algorithms" 2nd edition by Jean Meeus (Willmann-Bell, Richmond) 1998.
 pa = atan(sin(H), tan(phi) * cos(c.dec) - sin(c.dec) * cos(H));

 h = h + astroRefraction(h); // altitude correction for refraction

 return {
 azimuth: azimuth(H, phi, c.dec),
 altitude: h,
 distance: c.dist,
 parallacticAngle: pa
 };
 };


 // calculations for illumination parameters of the moon,
 // based on http://idlastro.gsfc.nasa.gov/ftp/pro/astro/mphase.pro formulas and
 // Chapter 48 of "Astronomical Algorithms" 2nd edition by Jean Meeus (Willmann-Bell, Richmond) 1998.

 SunCalc.getMoonIllumination = function (date) {

 var d = toDays(date || new Date()),
 s = sunCoords(d),
 m = moonCoords(d),

 sdist = 149598000, // distance from Earth to Sun in km

 phi = acos(sin(s.dec) * sin(m.dec) + cos(s.dec) * cos(m.dec) * cos(s.ra - m.ra)),
 inc = atan(sdist * sin(phi), m.dist - sdist * cos(phi)),
 angle = atan(cos(s.dec) * sin(s.ra - m.ra), sin(s.dec) * cos(m.dec) -
              cos(s.dec) * sin(m.dec) * cos(s.ra - m.ra));

 return {
 fraction: (1 + cos(inc)) / 2,
 phase: 0.5 + 0.5 * inc * (angle < 0 ? -1 : 1) / Math.PI,
 angle: angle
 };
 };


 function hoursLater(date, h) {
 return new Date(date.valueOf() + h * dayMs / 24);
 }

 // calculations for moon rise/set times are based on http://www.stargazing.net/kepler/moonrise.html article

 SunCalc.getMoonTimes = function (date, lat, lng, inUTC) {
 var t = new Date(date);
 if (inUTC) t.setUTCHours(0, 0, 0, 0);
 else t.setHours(0, 0, 0, 0);

 var hc = 0.133 * rad,
 h0 = SunCalc.getMoonPosition(t, lat, lng).altitude - hc,
 h1, h2, rise, set, a, b, xe, ye, d, roots, x1, x2, dx;

 // go in 2-hour chunks, each time seeing if a 3-point quadratic curve crosses zero (which means rise or set)
 for (var i = 1; i <= 24; i += 2) {
 h1 = SunCalc.getMoonPosition(hoursLater(t, i), lat, lng).altitude - hc;
 h2 = SunCalc.getMoonPosition(hoursLater(t, i + 1), lat, lng).altitude - hc;

 a = (h0 + h2) / 2 - h1;
 b = (h2 - h0) / 2;
 xe = -b / (2 * a);
 ye = (a * xe + b) * xe + h1;
 d = b * b - 4 * a * h1;
 roots = 0;

 if (d >= 0) {
 dx = Math.sqrt(d) / (Math.abs(a) * 2);
 x1 = xe - dx;
 x2 = xe + dx;
 if (Math.abs(x1) <= 1) roots++;
 if (Math.abs(x2) <= 1) roots++;
 if (x1 < -1) x1 = x2;
 }

 if (roots === 1) {
 if (h0 < 0) rise = i + x1;
 else set = i + x1;

 } else if (roots === 2) {
 rise = i + (ye < 0 ? x2 : x1);
 set = i + (ye < 0 ? x1 : x2);
 }

 if (rise && set) break;

 h0 = h2;
 }

 var result = {};

 if (rise) result.rise = hoursLater(t, rise);
 if (set) result.set = hoursLater(t, set);

 if (!rise && !set) result[ye > 0 ? 'alwaysUp' : 'alwaysDown'] = true;

 return result;
 };


 // export as Node module / AMD module / browser variable
 if (typeof exports === 'object' && typeof module !== 'undefined') module.exports = SunCalc;
 else if (typeof define === 'function' && define.amd) define(SunCalc);
 else window.SunCalc = SunCalc;

 }());

export const generateSentence = (minutes, feeling, night) => {
    const minuteString = minutes > 1 ? 'minutes' : 'minute';

    const sentences = {
    day: {
    positive: {
    minutes: [
              [{
               emphasize: false,
               text: "Today is ",
               },
               {
               emphasize: true,
               text: `${minutes} ${minuteString} `,
               },
               {
               emphasize: false,
               text: "longer than yesterday. Happy days!"
               }],
              [{
               emphasize: false,
               text: "The sun is out for ",
               },
               {
               emphasize: true,
               text: `${minutes} more ${minuteString} `,
               },
               {
               emphasize: false,
               text: "today. Enjoy!"
               }],
              [{
               emphasize: true,
               text: `${minutes} extra ${minuteString} `,
               },
               {
               emphasize: false,
               text: "of sunshine today. Make them count!",
               }],
              [{
               emphasize: false,
               text: "Make sure to soak up that vitamin D. ",
               },
               {
               emphasize: true,
               text: `${minutes} more ${minuteString} `,
               },
               {
               emphasize: false,
               text: "of daylight today!",
               }],
              [{
               emphasize: false,
               text: "Smile! Today has ",
               },
               {
               emphasize: true,
               text: `${minutes} more ${minuteString} `,
               },
               {
               emphasize: false,
               text: "of daylight than yesterday!",
               }],
              [{
               emphasize: true,
               text: `${minutes} more ${minuteString} `,
               },
               {
               emphasize: false,
               text: "of daylight today. Just let it sink in…",
               }],
              [{
               emphasize: false,
               text: "Today is ",
               },
               {
               emphasize: true,
               text: `${minutes} ${minuteString} longer`,
               },
               {
               emphasize: false,
               text: ". It’s getting better and better!",
               }],
              [{
               emphasize: false,
               text: "Bring out your shorts, because today has ",
               },
               {
               emphasize: true,
               text: `${minutes} more ${minuteString} `,
               },
               {
               emphasize: false,
               text: "of sunlight.",
               }],
              [{
               emphasize: false,
               text: "Have a great day and enjoy those ",
               },
               {
               emphasize: true,
               text: `${minutes} extra ${minuteString} `,
               },
               {
               emphasize: false,
               text: "of daylight.",
               }],
              [{
               emphasize: false,
               text: "After darkness comes daylight. ",
               },
               {
               emphasize: true,
               text: `${minutes} more ${minuteString} `,
               },
               {
               emphasize: false,
               text: "to be precise!",
               }],
              ],
    seconds: [
              [{
               emphasize: false,
               text: "Little less than ",
               },
               {
               emphasize: true,
               text: "a minute ",
               },
               {
               emphasize: false,
               text: "of extra sunlight today. It’s getting better!",
               }],
              [{
               emphasize: false,
               text: "We’ve reached the tipping point: we’ll have more sunlight every day now!",
               }],
              [{
               emphasize: true,
               text: "About a minute ",
               },
               {
               emphasize: false,
               text: "of extra light. You’ll start noticing the difference soon!",
               }],
              [{
               emphasize: false,
               text: "There’s ",
               },
               {
               emphasize: true,
               text: "about a minute ",
               },
               {
               emphasize: false,
               text: "of extra light at the end of this tunnel.",
               }],
              [{
               emphasize: false,
               text: "We’ll have ",
               },
               {
               emphasize: true,
               text: "about a minute ",
               },
               {
               emphasize: false,
               text: "of extra light today. It’s upwards from here.",
               }],
              ],
    },
    negative: {
    minutes: [
              [{
               emphasize: false,
               text: "The sun will be out ",
               },
               {
               emphasize: true,
               text: `${minutes} ${minuteString} less `,
               },
               {
               emphasize: false,
               text: "today. Keep your head up!",
               }],
              [{
               emphasize: true,
               text: `${minutes} ${minuteString} less `,
               },
               {
               emphasize: false,
               text: "sunlight today, unfortunately. It’ll get better!",
               }],
              [{
               emphasize: false,
               text: "Sadly, the day will be ",
               },
               {
               emphasize: true,
               text: `${minutes} ${minuteString} shorter`,
               },
               {
               emphasize: false,
               text: ". Make the most out of it!"
               }],
              ],
    seconds: [
              [{
               emphasize: false,
               text: "Unfortunately, the day is a little bit shorter today. Make the most out of it!",
               }],
              [{
               emphasize: false,
               text: "Sadly, today is a tiny bit shorter than yesterday. Enjoy it while it lasts!",
               }],
              [{
               emphasize: false,
               text: "Today is shorter than yesterday. But fear not, brighter times ahead!",
               }],
              ],
    }
    },
    night: {
    positive: {
    minutes: [
              [{
               emphasize: false,
               text: "Get a good night’s sleep: tomorrow there’ll be ",
               },
               {
               emphasize: true,
               text: `${minutes} more ${minuteString} `,
               },
               {
               emphasize: false,
               text: "of sunlight.",
               }],
              [{
               emphasize: false,
               text: "Lights out. Enjoy ",
               },
               {
               emphasize: true,
               text: `${minutes} more ${minuteString} `,
               },
               {
               emphasize: false,
               text: "of sunlight tomorrow!",
               }],
              [{
               emphasize: false,
               text: "Bring out those pyjamas. ",
               },
               {
               emphasize: true,
               text: `${minutes} more ${minuteString} `,
               },
               {
               emphasize: false,
               text: "of light await tomorrow.",
               }],
              [{
               emphasize: false,
               text: "The sun has set for today. Embrace those ",
               },
               {
               emphasize: true,
               text: `${minutes} ${minuteString} `,
               },
               {
               emphasize: false,
               text: "of extra daylight tomorrow.",
               }],
              [{
               emphasize: false,
               text: "The sun has set. Soak up the extra vitamin D tomorrow!",
               }],
              ],
    seconds: [
              [{
               emphasize: false,
               text: "Get a good night’s sleep: tomorrow there’ll be more sunlight for you.",
               }],
              [{
               emphasize: false,
               text: "Bring out those pyjamas. More daylight awaits tomorrow!",
               }],
              [{
               emphasize: false,
               text: "The sun has set. Soak up the extra vitamin D tomorrow!",
               }],
              ],
    },
    negative: {
    minutes: [
              [{
               emphasize: false,
               text: "Unfortunately, tomorrow will be ",
               },
               {
               emphasize: true,
               text: `${minutes} ${minuteString} `,
               },
               {
               emphasize: false,
               text: "shorter than today. Make the most out of it!",
               }],
              [{
               emphasize: false,
               text: "Sadly, tomorrow will be ",
               },
               {
               emphasize: true,
               text: `${minutes} ${minuteString} `,
               },
               {
               emphasize: false,
               text: "shorter than today. Enjoy it while it lasts!",
               }],
              [{
               emphasize: false,
               text: "Tomorrow will be ",
               },
               {
               emphasize: true,
               text: `${minutes} ${minuteString} `,
               },
               {
               emphasize: false,
               text: "shorter than today. But fear not, brighter times ahead!",
               }],
              ],
    seconds: [
              [{
               emphasize: false,
               text: "Unfortunately, tomorrow will be a little bit shorter than today. Make the most out of it!",
               }],
              [{
               emphasize: false,
               text: "Sadly, tomorrow will be a tiny bit shorter than today. Enjoy it while it lasts!",
               }],
              [{
               emphasize: false,
               text: "Tomorrow will be shorter than today. But fear not, brighter times ahead!",
               }],
              ],
    }
    }
    };
    
    const phase = night ? 'night' : 'day';
    feeling = feeling ? 'positive' : 'negative';
    const daylight = minutes >= 1 ? 'minutes' : 'seconds';
    const sentenceArray = sentences[phase][feeling][daylight];
    
    return sentenceArray[Math.floor(Math.random() * sentenceArray.length)];
}

const themes = {
sunrise: {
name: 'sunrise',
colors: {
text: '219,96,40',
background: '253,237,168',
}
},
daylight: {
name: 'daylight',
colors: {
text: '160,76,44',
background: '250,221,164',
}
},
sunset: {
name: 'sunset',
colors: {
text: '160,76,44',
background: '247,197,177',
}
},
twilight: {
name: 'twilight',
colors: {
text: '64,88,155',
background: '211,229,253',
}
},
night: {
name: 'night',
colors: {
text: '144,207,239',
background: '6,19,31',
}
},
}

export default class Sun {
    constructor(location) {
        this.latitude = location.latitude;
        this.longitude = location.longitude;
    }

    getPosition(progress) {
        const position = (Math.PI + (progress * Math.PI));

        if (progress > 1 || progress < 0) { return null; }

        const x = 50 + Math.cos(position) * 50;
        const y = Math.abs(Math.sin(position) * 100);
        return {x,y}
    }

    getTimes(date) {
        return SunCalc.getTimes(date, this.latitude, this.longitude)
    }

    getDay(now) {
        let yesterday = new Date();
        let tomorrow = new Date();
        yesterday.setDate(now.getDate() - 1);
        tomorrow.setDate(now.getDate() + 1);

        const days = {
        now: this.getTimes(now),
        yesterday: this.getTimes(yesterday),
        tomorrow: this.getTimes(tomorrow),
        }

        const daylight = {
        now: this._daylight(days.now),
        yesterday: this._daylight(days.yesterday),
        tomorrow: this._daylight(days.tomorrow),
        }

        const theme = this.getTheme(now, days.now);
        let sentence = [];
        let minutes = 0;

        if (theme.name !== 'night') {
            minutes = this._daylightDiff(daylight.yesterday, daylight.now);
            sentence = generateSentence(minutes, daylight.now > daylight.yesterday, false);
        } else {
            minutes = this._daylightDiff(daylight.tomorrow, daylight.now);
            sentence = generateSentence(minutes, daylight.tomorrow > daylight.now, true);
        }

        return {
            theme,
            sentence,
        sunrise: days.now.sunrise,
        sunset: days.now.sunset,
        }
    }

    getTheme(now, sun) {
        let theme = '';
        if (now >= sun.sunrise && now <= sun.sunriseEnd) {
            theme = 'sunrise';
        } else if (now >= sun.sunriseEnd  && now <= sun.sunsetStart) {
            theme = 'daylight';
        } else if (now >= sun.sunsetStart && now <= sun.sunset) {
            theme = 'sunset';
        } else if (now >= sun.night || now <= sun.nightEnd) {
            theme = 'night';
        } else {
            theme = 'twilight';
        }

        return themes[theme];
    }
    
    _daylight(day) {
        return (day.sunset - day.sunriseEnd) / 60000; 
    }
    
    _daylightDiff(x, y) {
        return Math.abs(Math.round(x - y));
    } 
}
