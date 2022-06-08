import { mkfifo } from "mkfifo";
import { createWriteStream } from 'fs'
import { spawn } from 'child_process'
import { unlink } from "fs/promises";
import mpd from 'mpd-parser';
import axios from "axios";
import { setTimeout } from "timers/promises";
import express from "express";
import { v4 } from "uuid";
const app = express();

const DEBUG = process.env.DEBUG;
const PORT = process.env.PORT || 3000;

function write(stream, data, cb) {
    try {
        if (!stream.write(data)) {
          v.once('drain', cb);
        } else {
          process.nextTick(cb);
        }
    } catch (error) {
        
    }
}

function gethighestBitrate(playlists){
    let bitrate;
    let bitIndex;
    for (let index = 0; index < playlists.length; index++) {
        bitrate ||= playlists[index].attributes.BANDWIDTH;
        if(playlists[index].attributes.BANDWIDTH > bitrate){
            bitrate = playlists[index].attributes.BANDWIDTH;
            bitIndex = index;
        }
    }
    return bitIndex;
}

app.get('/', async (req,res) => {
    if(!req.query.url){
        res.status(400).send("No URL provided\n")
        return
    }
    if(!req.query.key_v){
        res.status(400).send("No key for video provided\n")
        return
    }
    if(!req.query.key_a){
        res.status(400).send("No key for audio provided\n")
        return
    }
    let mpdURL = req.query.url;
    let manifest = await axios.get(mpdURL)
    let parsed = mpd.parse(manifest.data, {manifestUri: `${mpdURL.match("(.*)/(.*)")[1]}/`})
    let stream_play = parsed.playlists[gethighestBitrate(parsed.playlists)]
    let index_v = stream_play.mediaSequence
    let index_a = parsed.mediaGroups.AUDIO.audio[Object.keys(parsed.mediaGroups.AUDIO.audio)[0]].playlists[0].segments[0].number;
    index_v > index_a ? index_v-- : index_a > index_v ? index_a-- : null
    let vI = await axios({
        method: 'get',
        headers:{
            "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:100.0) Gecko/20100101 Firefox/100.0"
        },
        url: stream_play.segments[0].map.resolvedUri,
        responseType: 'arraybuffer',
    })

    let aI = await axios({
        method: 'get',
        headers:{
            "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:100.0) Gecko/20100101 Firefox/100.0"
        },
        url: parsed.mediaGroups.AUDIO.audio[Object.keys(parsed.mediaGroups.AUDIO.audio)[0]].playlists[0].segments[0].map.resolvedUri,
        responseType: 'arraybuffer',
    })

    let video = v4();
    let audio = v4();
    let v, a;
    let vS_1, aS_1;
    await new Promise((resolve, reject) => {
        mkfifo(`/tmp/${video}`, 0o600, async () => {
            v = createWriteStream(`/tmp/${video}`, {autoClose: false})
            v.once('ready', () => {
                DEBUG && console.log("ready video");
                // vI.data.pipe(v);
                write(v, vI.data, async () => {
                    vS_1 = await axios({
                        method: 'get',
                        headers:{
                            "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:100.0) Gecko/20100101 Firefox/100.0"
                        },
                        url: `${mpdURL.match("(.*)/(.*)")[1]}/${stream_play.segments[0].uri.match("(.*)_(.*)\.(.*)")[1]}_${index_v}${stream_play.segments[0].uri.match(/\.[0-9a-z]+$/i)[0]}`,
                        responseType: 'stream',
                    })
                    DEBUG && console.log("writing video");
                    DEBUG && console.log(`current segment video ${index_v}`);
                    vS_1.data.pipe(v, {end: false})
                    index_v++;
              })

            })
            resolve();
        })
    })
    await new Promise((resolve, reject) => {
        mkfifo(`/tmp/${audio}`, 0o600, async () => {
            a = createWriteStream(`/tmp/${audio}`, {autoClose: false})
            a.once('ready', () => {
                DEBUG && console.log("ready audio");
                write(a, aI.data, async () => {
                    aS_1 = await axios({
                        method: 'get',
                        headers:{
                            "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:100.0) Gecko/20100101 Firefox/100.0"
                        },
                        url: `${mpdURL.match("(.*)/(.*)")[1]}/${parsed.mediaGroups.AUDIO.audio[Object.keys(parsed.mediaGroups.AUDIO.audio)[0]].playlists[0].segments[0].map.uri.match("(.*)_(.*)\.(.*)")[1]}_${index_a}${parsed.mediaGroups.AUDIO.audio[Object.keys(parsed.mediaGroups.AUDIO.audio)[0]].playlists[0].segments[0].uri.match(/\.[0-9a-z]+$/i)[0]}`,
                        responseType: 'stream',
                    })
                    // v.write(vS.data);
                    DEBUG && console.log("writing audio");
                    DEBUG && console.log(`current segment audio ${index_a}`);
                    aS_1.data.pipe(a, {end: false})
                    index_a++;
                })
                // aI.data.pipe(a)
            })
            resolve()
        })
    })
    const tA = new AbortController();
    const tV = new AbortController();
    let writeToRes = (chunk) =>  res.writable && res.write(chunk)
    let writeVideoFragment = async () => {
        let vS = await axios({
            method: 'get',
            headers:{
                "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:100.0) Gecko/20100101 Firefox/100.0"
            },
            url: `${mpdURL.match("(.*)/(.*)")[1]}/${stream_play.segments[0].uri.match("(.*)_(.*)\.(.*)")[1]}_${index_v}${stream_play.segments[0].uri.match(/\.[0-9a-z]+$/i)[0]}`,
            responseType: 'stream',
        })
        try {
            await setTimeout((stream_play.targetDuration * 1000) - 300, undefined, {signal: tV.signal})
            DEBUG && console.log(`current segment video ${index_v}`);
            !proc.killed && v.writable && vS.data.pipe(v, {end: false})
            index_v++;
        } catch (error) {
            // console.log(error);
        }
    }
    let writeAudioFragment = async () => {
        let aS = await axios({
            method: 'get',
            headers:{
                "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:100.0) Gecko/20100101 Firefox/100.0"
            },
            url: `${mpdURL.match("(.*)/(.*)")[1]}/${parsed.mediaGroups.AUDIO.audio[Object.keys(parsed.mediaGroups.AUDIO.audio)[0]].playlists[0].segments[0].map.uri.match("(.*)_(.*)\.(.*)")[1]}_${index_a}${parsed.mediaGroups.AUDIO.audio[Object.keys(parsed.mediaGroups.AUDIO.audio)[0]].playlists[0].segments[0].uri.match(/\.[0-9a-z]+$/i)[0]}`,
            responseType: 'stream',
        })
        try {
            await setTimeout((stream_play.targetDuration * 1000) - 300, undefined, {signal: tA.signal})
            DEBUG && console.log(`current segment audio ${index_a}`);
            !proc.killed && a.writable && aS.data.pipe(a, {end: false})
            index_a++;
        } catch (error) {
            // console.log(error);
        }
    }
    let proc = spawn("ffmpeg", [
        '-y',
        '-loglevel', 
        'quiet',
        '-re',
        '-decryption_key',
        req.query.key_v,
        '-vsync',
        'vfr',
        '-copyts',
        '-copytb',
        '1',
        '-thread_queue_size',
        '1024',
        '-i',
        `/tmp/${video}`,
        '-decryption_key',
        req.query.key_a,
        '-thread_queue_size',
        '1024',
        '-i',
        `/tmp/${audio}`,
        '-c',
        'copy',
        // '-bufsize',
        // '900k',
        '-f',
        'mpegts',
        'pipe:'
      ], {stdio: ['ignore', "pipe", 'ignore'], detached: true})
      v.on('unpipe', writeVideoFragment)

      a.on('unpipe', writeAudioFragment)
        //   proc.stderr.pipe(process.stderr)
        proc.stdout.on('data', writeToRes)
    v.once('error', (err) => {
        isError = err;
    })
    a.once('error', (err) => {
        isError = err;
    })
    req.once('close', () => {
        aS_1.data.unpipe();
        vS_1.data.unpipe();
        v.close();
        a.close();
        try {
            tA.abort();
            tV.abort();
        } catch (error) {
            
        }
        unlink(`/tmp/${video}`);
        unlink(`/tmp/${audio}`);
        proc.removeListener('data', writeToRes)
        proc.kill("SIGKILL");
        a.removeListener('unpipe', writeAudioFragment)
        v.removeListener('unpipe', writeVideoFragment)
    })
})

app.listen(PORT, () => {
    console.log(`listening on ${PORT}`);
})







