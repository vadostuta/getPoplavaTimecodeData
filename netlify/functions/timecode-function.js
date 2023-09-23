const { schedule } = require('@netlify/functions')

const dotenv = require('dotenv').config()
const { google } = require('googleapis')

const { Storage } = require('@google-cloud/storage')
const path = require('path')

const chaptersVideosIds = []
const formattedChapters = []

let mainJSONData

function getChapters (data) {
  const startIndex = data.indexOf('0:00')
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

async function getVideoChaptersData (videoId) {
  if (!videoId) {
    return
  }

  const payload = {
    key: process.env.YOUTUBE_TOKEN,
    id: videoId,
    part: 'snippet'
  }

  try {
    const res = await google.youtube('v3').videos.list(payload)
    const item = res.data.items[0].snippet

    const data = {
      videoId,
      title: item.title,
      chapters: getChapters(item.description),
      thumbnails: item.thumbnails.high.url
    }

    formattedChapters.push(data)
  } catch (err) {
    console.log(err)
  }
}

async function setMainJSONData () {
  const videosIdsPromises = chaptersVideosIds.map(
    async videoIds => await getVideoChaptersData(videoIds)
  )

  await Promise.all(videosIdsPromises)

  // set main JSON formatted data
  mainJSONData = JSON.stringify(formattedChapters)
}

async function updateChaptersVideosIds (nextPageToken) {
  const payload = {
    key: process.env.YOUTUBE_TOKEN,
    channelId: process.env.YOUTUBE_CHANNEL_ID,
    part: 'snippet,id',
    order: 'date',
    maxResults: '50', // youtube can give us only max 50 items per request
    pageToken: nextPageToken || ''
  }

  try {
    const res = await google.youtube('v3').search.list(payload)
    const videoIds = res.data.items.map(el => el.id.videoId)
    chaptersVideosIds.push(...videoIds)
    if (res.data.nextPageToken) {
      await updateChaptersVideosIds(res.data.nextPageToken)
    } else {
      // If there's no 'nextPageToken,' assume that it's the last page.
      await setMainJSONData()
    }
  } catch (err) {
    console.log(err)
  }
}

async function getTimecodeData () {
  /**
   * Flow to get all chapters:
   * - get all videos id
   * - from all that ids get video data
   */
  await updateChaptersVideosIds()
}

async function uploadJsonFileToFirebase () {
  // by await here we wait for mainJSONData to be setted
  await getTimecodeData()

  const jsonString = JSON.stringify(mainJSONData)

  // Create a buffer from the JSON string
  const buffer = Buffer.from(jsonString, 'utf-8')

  // Construct an absolute path
  const keyFilename = path.join(__dirname, '../../firebase-admin-key.json')

  // Initialize Firebase Storage
  const storage = new Storage({
    projectId: process.env.FIREBASE_PROJECT_ID,
    keyFilename: keyFilename
  })

  // Specify the filename and destination in your storage bucket
  const bucketName = process.env.STORAGE_BUCKET_NAME
  const fileName = process.env.FILENAME_IN_STORAGE

  // Upload the buffer to Firebase Storage
  const bucket = storage.bucket(bucketName)
  const file = bucket.file(fileName)

  try {
    await file.save(buffer, {
      metadata: {
        contentType: 'application/json'
      }
    })

    console.log(`Data uploaded to Firebase Storage successfully.`)
  } catch (error) {
    console.error('Error uploading data to Firebase Storage:', error.message)
  }
}

const handler = async (event, context) => {
  try {
    await uploadJsonFileToFirebase()

    return {
      statusCode: 200
    }
  } catch (e) {
    console.log({ e })
    return {
      statusCode: 500,
      message: e
    }
  }
}
exports.handler = schedule('@daily', handler)
