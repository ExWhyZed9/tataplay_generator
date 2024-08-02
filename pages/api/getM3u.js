import axios from 'axios';
import { Buffer } from 'buffer';

// Converts a hexadecimal string to URL-safe Base64 encoding
const hexToBase64 = (hex) => {
    try {
        const bytes = Buffer.from(hex, 'hex');
        let base64 = bytes.toString('base64');
        
        base64 = base64.replace(/=*$/, '');
        console.log(`Hex to Base64 conversion: ${hex} -> ${base64}`);
        return base64;
    } catch (error) {
        console.error('Error converting hex to base64:', error.message);
        return null;
    }
};

// Fetches data
const fetchData = async (url) => {
    try {
        console.log(`Fetching data from: ${url}`);
        const response = await axios.get(url);
        console.log(`Data fetched successfully from ${url}`);
        return response.data;
    } catch (error) {
        console.error('Request failed:', error.message);
        throw error;
    }
};

// Fetches channel data and formats it
const fetchChannelData = async () => {
    try {
        console.log('Fetching channel data...');
        const response = await fetchData("https://fox.toxic-gang.xyz/tata/channels");

        
        const channels = response?.data || [];
        console.log(`Channels data fetched successfully. Total channels: ${channels.length}`);

        return channels.map(channel => {
            // Create clearkey data from licence1 and licence2
            let clearkeyData = null;
            if (channel.licence1 && channel.licence2) {
                const base64Licence1 = hexToBase64(channel.licence1);
                const base64Licence2 = hexToBase64(channel.licence2);
                if (base64Licence1 && base64Licence2) {
                    clearkeyData = {
                        keys: [{
                            kty: "oct",
                            k: base64Licence2,
                            kid: base64Licence1
                        }],
                        type: "temporary"
                    };
                    console.log(`Clearkey data created for channel ${channel.id}: ${JSON.stringify(clearkeyData)}`);
                } else {
                    console.log(`Clearkey data not created for channel ${channel.id} due to Base64 conversion failure.`);
                }
            } else {
                console.log(`Clearkey data not created for channel ${channel.id} due to missing licence1 or licence2.`);
            }

            return {
                id: channel.id,
                name: channel.title,
                tvg_id: channel.id, 
                group_title: channel.genre || null,
                tvg_logo: channel.logo,
                stream_url: channel.initialUrl,
                license_url: null,
                stream_headers: null,
                drm: null,
                is_mpd: true,
                kid_in_mpd: channel.kid,
                hmac_required: null,
                key_extracted: null,
                pssh: channel.psshSet || null,
                clearkey: clearkeyData ? JSON.stringify(clearkeyData) : null,
                hma: null
            };
        });
    } catch (error) {
        console.error('Fetch error:', error.message);
        return [];
    }
};

// Fetches HMAC data
const fetchHmacData = async () => {
    try {
        console.log('Fetching HMAC data...');
        const data = await fetchData('https://fox.toxic-gang.xyz/tata/hmac');
        
        if (data && Array.isArray(data) && data.length > 0) {
            const hmacData = data[0]?.data || {};
            const hmacValue = hmacData.hdntl || null;
            console.log(`HMAC data fetched successfully. HMAC Value: ${hmacValue}`);
            return hmacValue;
        } else {
            console.error('No HMAC data found in the response.');
            return null;
        }
    } catch (error) {
        console.error('Error fetching HMAC data:', error.message);
        return null;
    }
};

// Combines channel data with HMAC value
const combineData = (channels, hmacValue) => {
    console.log('Combining channel data with HMAC value...');
    return channels.map(channel => ({
        id: channel.id,
        name: channel.name,
        tvg_id: channel.tvg_id,
        group_title: channel.group_title,
        tvg_logo: channel.tvg_logo,
        stream_url: channel.stream_url,
        license_url: channel.license_url,
        stream_headers: channel.stream_headers,
        drm: channel.drm,
        is_mpd: channel.is_mpd,
        kid_in_mpd: channel.kid_in_mpd,
        hmac_required: channel.hmac_required,
        key_extracted: channel.key_extracted,
        pssh: channel.pssh,
        clearkey: channel.clearkey,
        hma: hmacValue
    }));
};

// Generates M3U playlist string
const generateM3u = async () => {
    try {
        console.log('Generating M3U playlist...');
        const channels = await fetchChannelData();
        const hmacValue = await fetchHmacData();
        const combinedData = combineData(channels, hmacValue);

        let m3uStr = '#EXTM3U x-tvg-url="https://raw.githubusercontent.com/mitthu786/tvepg/main/tataplay/epg.xml.gz"\n\n';
        
        combinedData.forEach(channel => {
            m3uStr += `#EXTINF:-1 tvg-id="${channel.tvg_id}" `;
            m3uStr += `group-title="${channel.group_title}", tvg-logo="${channel.tvg_logo}", ${channel.name}\n`;
            m3uStr += '#KODIPROP:inputstream.adaptive.license_type=clearkey\n';
            m3uStr += `#KODIPROP:inputstream.adaptive.license_key=${channel.clearkey || ''}\n`;
            m3uStr += '#EXTVLCOPT:http-user-agent=Mozilla/5.0\n';
            m3uStr += `#EXTHTTP:{"cookie":"${channel.hma || ''}"}\n`;
            m3uStr += `${channel.stream_url}|cookie:${channel.hma || ''}\n\n`;
        });

        console.log('M3U playlist generated successfully.');
        return m3uStr;
    } catch (error) {
        console.error('Error generating M3U:', error.message);
        throw error;
    }
};

// API handler for HTTP requests
export default async function handler(req, res) {
    try {
        console.log('Handling API request...');
        const m3uString = await generateM3u();
        res.status(200).send(m3uString);
        console.log('API request handled successfully.');
    } catch (error) {
        console.error('Error handling API request:', error.message);
        res.status(500).send('Internal Server Error');
    }
}
