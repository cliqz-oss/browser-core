'use strict';

/*
This provides the downloadable link for youtube videos.
Most of the regex and concepts have been picked up from https://github.com/gantt/downloadyoutube.

The idea would be to move the patterns and other config to a web-service so that if patterns change we can easily update the changes.
*/


const TITLE_REGEX = /<meta\s+name="title"\s+content="([^"]*)">/
const FORMAT_LABEL = {'5':'FLV 240p','18':'MP4 360p','22':'MP4 720p','34':'FLV 360p','35':'FLV 480p','37':'MP4 1080p','38':'MP4 2160p','43':'WebM 360p','44':'WebM 480p','45':'WebM 720p','46':'WebM 1080p','135':'MP4 480p - no audio','137':'MP4 1080p - no audio','138':'MP4 2160p - no audio','139':'M4A 48kbps - audio','140':'M4A 128kbps - audio','141':'M4A 256kbps - audio','264':'MP4 1440p - no audio','266':'MP4 2160p - no audio','298':'MP4 720p60 - no audio','299':'MP4 1080p60 - no audio'};
const FORMAT_TYPE = {'5':'flv','18':'mp4','22':'mp4','34':'flv','35':'flv','37':'mp4','38':'mp4','43':'webm','44':'webm','45':'webm','46':'webm','135':'mp4','137':'mp4','138':'mp4','139':'m4a','140':'m4a','141':'m4a','264':'mp4','266':'mp4','298':'mp4','299':'mp4'};
const FORMAT_ORDER = ['5','18','34','43','35','135','44','22','298','45','37','299','46','264','38','266','139','140','141'];
const FORMAT_RULE = {'flv':'none','mp4':'all','webm':'max','m4a':'max'};
// all = display all versions, max = only highest quality version, none = no version
// the default settings show all MP4 videos, the highest quality FLV and no WebM
const SHOW_DASH_FORMATS = false;

function findMatch(text, regexp) {
    const matches = text.match(regexp);
    return (matches) ? matches[1] : null;
}

function findVideoLinks(youtubePageContent) {
  osAPI.notifyYoutubeVideoUrls(get_links(youtubePageContent));
}

function getSeparators(videoFormats) {
  let sep1, sep2, sep3;
  if (videoFormats.indexOf(',') > -1) {
    sep1 = ',';
    sep2 = (videoFormats.indexOf('&') > -1) ? '&' : '\\u0026';
    sep3 = '=';
  } else {
    sep1 = '%2C';
    sep2 = '%26';
    sep3 = '%3D';
  }
  return { sep1, sep2, sep3 };
}

function get_links(bodyContent) {
  let videoID = null,
      videoFormats,
      videoAdaptFormats,
      videoManifestURL;

  if (bodyContent !== null) {
    videoID = findMatch(bodyContent, /\"video_id\":\s*\"([^\"]+)\"/);
    videoFormats = findMatch(bodyContent, /\"url_encoded_fmt_stream_map\":\s*\"([^\"]+)\"/);
    videoAdaptFormats = findMatch(bodyContent, /\"adaptive_fmts\":\s*\"([^\"]+)\"/);
    videoManifestURL = findMatch(bodyContent, /\"dashmpd\":\s*\"([^\"]+)\"/);
  }

  let videoTitle = findMatch(bodyContent, TITLE_REGEX);
  videoTitle = (videoTitle) ? videoTitle : 'Youtube Video';

  // parse the formats map
  const { sep1, sep2, sep3 } = getSeparators(videoFormats);


  let videoURL = [];
  let videoSignature = [];
  if (videoAdaptFormats) {
    videoFormats = videoFormats + sep1 + videoAdaptFormats;
  }

  let videoFormatsGroup = videoFormats.split(sep1);
  for (let i = 0; i < videoFormatsGroup.length; i++) {
    let videoFormatsElem = videoFormatsGroup[i].split(sep2);
    let videoFormatsPair = [];
    for (let j = 0; j<videoFormatsElem.length; j++) {
      let pair = videoFormatsElem[j].split(sep3);
      if (pair.length === 2) {
        videoFormatsPair[pair[0]] = pair[1];
      }
    }
    if (videoFormatsPair['url'] === null) {
      continue;
    }
    let url = unescape(unescape(videoFormatsPair['url'])).replace(/\\\//g,'/').replace(/\\u0026/g,'&');
    if (videoFormatsPair['itag'] === null) {
      continue;
    }
    let itag = videoFormatsPair['itag'];
    let sig = videoFormatsPair['sig']||videoFormatsPair['signature'];
    if (sig) {
      url = url+'&signature=' + sig;
      videoSignature[itag] = null;
    }
    else if (videoFormatsPair['s']) {
      url = url+'&signature=' + videoFormatsPair['s'];
      videoSignature[itag] = videoFormatsPair['s'];
    }
    if (url.toLowerCase().indexOf('ratebypass') === -1) { // speed up download for dash
      url = url+'&ratebypass = yes';
    }
    if (url.toLowerCase().indexOf('http') === 0) { // validate URL
      videoURL[itag] = url + '&title=' + videoTitle;
    }
  }

  let showFormat = [];
  for (let category in FORMAT_RULE) {
    const rule = FORMAT_RULE[category];
    for (let index in FORMAT_TYPE){
      if (FORMAT_TYPE[index] === category) {
        showFormat[index] = (rule === 'all');
      }
    }
    if (rule === 'max') {
      for (let i = FORMAT_ORDER.length-1; i >= 0; i--) {
        let format = FORMAT_ORDER[i];
        if (FORMAT_TYPE[format] === category && videoURL[format] !== undefined) {
          showFormat[format] = true;
          break;
        }
      }
    }
  }

  let downloadCodeList = [];
  for (let i = 0; i < FORMAT_ORDER.length; i++) {
    let format = FORMAT_ORDER[i];
    if (format === '37' && videoURL[format] === undefined) { // hack for dash 1080p
      if (videoURL['137']) {
       format = '137';
      }
      showFormat[format] = showFormat['37'];
    } else if (format === '38' && videoURL[format] === undefined) { // hack for dash 4K
      if (videoURL['138'] && !videoURL['266']) {
        format='138';
      }
      showFormat[format] = showFormat['38'];
    }
    if (!SHOW_DASH_FORMATS && format.length>2) {
      continue;
    }
    if (videoURL[format] !== undefined && FORMAT_LABEL[format] !== undefined && showFormat[format]) {
      downloadCodeList.push({ url:encodeURIComponent(videoURL[format]), sig:videoSignature[format], format:format, label:FORMAT_LABEL[format] });
      console.log('DYVAM - Info: itag'+format+' url:'+videoURL[format]);
    }
  }

  if (downloadCodeList.length === 0) {
    console.log('No download URL found. Probably YouTube uses encrypted streams.');
  }
  return downloadCodeList;
}


export { findVideoLinks as findVideoLinks };
