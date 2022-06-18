const dotenv = require('dotenv').config()
const { google } = require('googleapis');
const fs = require('fs');

const arrVideosIds = []
const formattedChapters = []

function saveToJson (data) {
  // convert JSON object to string
  const stringifiedData = JSON.stringify(data);
  // write JSON string to a file
  fs.writeFile('poplava.json', stringifiedData, (err) => {
    if (err) {
        throw err;
    }
    console.log("JSON data is saved.");
  });
}

function getChapters (data) {
  const startIndex = data.indexOf('00:00')
  const chapters = data.slice(startIndex)
  // some cleaning and trimming to get needed response
  const cleanChapters = chapters
    .replace(/[+]/g, '')
    .replace(/[']/g, '')
    .split('\n')
    .filter(el => el.length > 5)
    .map(v => v.trim())

  return cleanChapters
}

function getVideoChapters (videoId) {
  if (!videoId) {
    return
  }

  const payload = {
    key: process.env.YOUTUBE_TOKEN,
    id: videoId,
    part: 'snippet'
  }

  return google.youtube('v3').videos.list(payload)
    .then(res => {
      const item = res.data.items[0].snippet;

      const data = {
        videoId,
        title: item.title,
        chapters: getChapters(item.description),
        thumbnails: item.thumbnails.high.url
      }

      formattedChapters.push(data)
    })
    .catch(err => console.log(err))
};

async function getAllChaptersData () {
  const videosIdsPromises = arrVideosIds.map(async videoIds => await getVideoChapters(videoIds))

  Promise.all(videosIdsPromises).then((values) => {
    saveToJson(formattedChapters)
  });
}

function handkeGetAllChapters (nextPageToken) {
  const payload = {
    key: process.env.YOUTUBE_TOKEN,
    channelId: 'UCwCkRo2WQx_9JRWISLC47fw',
    part: 'snippet,id',
    order: 'date',
    maxResults: '50', // youtube can give us only max 50 items per request
    pageToken: nextPageToken || ''
  }

  return google.youtube('v3').search.list(payload)
    .then(res => {
      const videoIds = res.data.items.map(el => el.id.videoId)
      arrVideosIds.push(...videoIds)

      if (res.data.nextPageToken) {
        handkeGetAllChapters(res.data.nextPageToken)
      } else {
        // If there no 'nextPageToken' I assume that it is last page.
        getAllChaptersData()
      }
    })
    .catch(err => console.log(err))
}

function initJSON () {
  /**
   * Flow to get all chapters:
   * - get all videos id
   * - from all that ids get video data
   * - save to json file
   */
  handkeGetAllChapters()
}

initJSON()