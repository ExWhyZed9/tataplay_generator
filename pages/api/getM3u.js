// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import fetch from "cross-fetch";

const getUserChanDetails = async () => {
    let hmacValue;
    let obj = { list: [] };

    try {
        const responseHmac = await fetch("https://fox.toxic-gang.xyz/tata/hmac");
        const data = await responseHmac.json();
        const hmacData = data[0];
        hmacValue = hmacData.data.hdntl;
    } catch (error) {
        console.error('Error fetching and rearranging HMAC data:', error);
        return obj;
    }

    try {
        const responseChannels = await fetch("https://lust.toxicify.pro/api/toxicify.json");
        const cData = await responseChannels.json();

        if (cData && cData.data && Array.isArray(cData.data)) {
            const flatChannels = cData.data.flat();
            flatChannels.forEach(channel => {
                let firstGenre = channel.genre || null;
                let rearrangedChannel = {
                    id: channel.id,
                    name: channel.name,
                    tvg_id: channel.id,
                    group_title: firstGenre,
                    tvg_logo: channel.logo,
                    stream_url: channel.mpd,
                    license_url: null,
                    stream_headers: null,
                    drm: null,
                    is_mpd: true,
                    kid_in_mpd: channel.kid,
                    hmac_required: null,
                    key_extracted: null,
                    pssh: channel.pssh,
                    clearkey: channel.clearkeys_base64 ? JSON.stringify(channel.clearkeys_base64) : null,
                    hma: hmacValue
                };
                obj.list.push(rearrangedChannel);
            });
        }
    } catch (error) {
        console.error('Fetch error:', error);
        return obj;
    }

    return obj;
};

const generateM3u = async (ud) => {
    let m3uStr = '';

    let userChanDetails = await getUserChanDetails();
    let chansList = userChanDetails.list;

    m3uStr = '#EXTM3U x-tvg-url="https://raw.githubusercontent.com/mitthu786/tvepg/main/tataplay/epg.xml.gz"\n\n';

    for (let i = 0; i < chansList.length; i++) {
        m3uStr += '#EXTINF:-1 tvg-id="' + chansList[i].id.toString() + '" ';
        m3uStr += 'group-title="' + (chansList[i].group_title) + '", tvg-logo="https://mediaready.videoready.tv/tatasky-epg/image/fetch/f_auto,fl_lossy,q_auto,h_250,w_250/' + chansList[i].tvg_logo + '", ' + chansList[i].name + '\n';
        m3uStr += '#KODIPROP:inputstream.adaptive.license_type=clearkey\n';
        m3uStr += '#KODIPROP:inputstream.adaptive.license_key=' + chansList[i].clearkey + '\n';
        m3uStr += '#EXTVLCOPT:http-user-agent=Mozilla/5.0\n';
        m3uStr += '#EXTHTTP:{"cookie":"' + chansList[i].hma + '"}\n';
        m3uStr += chansList[i].stream_url + '|cookie:' + chansList[i].hma + '\n\n';
    }

    console.log('all done!');
    return m3uStr;
};

export default async function handler(req, res) {
    let uData = {
        tsActive: true
    };

    if (uData.tsActive) {
        let m3uString = await generateM3u(uData);
        res.status(200).send(m3uString);
    }
}
