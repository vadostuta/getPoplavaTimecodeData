const { schedule } = require("@netlify/functions");
// const { initJSON } = require("../../initJSON");

const dotenv = require('dotenv').config()
const { google } = require('googleapis');

// const firebase = require("firebase/app");
// require("firebase/storage");
// const { getStorage, ref, uploadBytesResumable } = require("firebase/storage");

const {Storage} = require('@google-cloud/storage');

// const { firebase } = require('@firebase/storage');
const fs = require('fs');

const arrVideosIds = []
const formattedChapters = []

gav = []

// function saveToJson (data) {
//   // remove file before creating new
//   const path = 'poplava.json'
//   if (fs.existsSync(path)) {
//     fs.unlink(path, (err) => {
//       if (err) {
//         console.error(`Error deleting the file: ${err.message}`);
//       } else {
//         console.log(`File ${path} has been successfully deleted.`);
//       }
//     });
//   }

//   // convert JSON object to string
//   const stringifiedData = JSON.stringify(data);
//   // write JSON string to a file
//   fs.writeFile('poplava.json', stringifiedData, (err) => {
//     if (err) {
//         throw err;
//     }
//     console.log("JSON data is saved.");
//   });
// }

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

async function getVideoChapters (videoId) {
  if (!videoId) {
    return
  }

  const payload = {
    key: process.env.GAV,
    id: videoId,
    part: 'snippet'
  }

  // return google.youtube('v3').videos.list(payload)
  //   .then(res => {
  //     const item = res.data.items[0].snippet;

  //     const data = {
  //       videoId,
  //       title: item.title,
  //       chapters: getChapters(item.description),
  //       thumbnails: item.thumbnails.high.url
  //     }

  //     formattedChapters.push(data)
  //   })
  //   .catch(err => console.log(err))
  try {
    const res = await google.youtube('v3').videos.list(payload);
    const item = res.data.items[0].snippet;

    const data = {
      videoId,
      title: item.title,
      chapters: getChapters(item.description),
      thumbnails: item.thumbnails.high.url,
    };

    formattedChapters.push(data);
  } catch (err) {
    console.log(err);
  }
};

async function getAllChaptersData () {
  const videosIdsPromises = arrVideosIds.map(async videoIds => await getVideoChapters(videoIds))

  await Promise.all(videosIdsPromises)

  gav = JSON.stringify(formattedChapters);
}

async function getAllChapters (nextPageToken) {
  const payload = {
    key: process.env.GAV,
    channelId: 'UCwCkRo2WQx_9JRWISLC47fw', // TODO: add in envs
    part: 'snippet,id',
    order: 'date',
    maxResults: '50', // youtube can give us only max 50 items per request
    pageToken: nextPageToken || ''
  }

  // return google.youtube('v3').search.list(payload)
  //   .then(res => {
  //     const videoIds = res.data.items.map(el => el.id.videoId)
  //     arrVideosIds.push(...videoIds)

  //     if (res.data.nextPageToken) {
  //       getAllChapters(res.data.nextPageToken)
  //     } else {
  //       // If there no 'nextPageToken' I assume that it is last page.
  //       getAllChaptersData()
  //     }
  //   })
  //   .catch(err => console.log(err))

    try {
      const res = await google.youtube('v3').search.list(payload);
      const videoIds = res.data.items.map(el => el.id.videoId);
      arrVideosIds.push(...videoIds);
      if (res.data.nextPageToken) {
        await getAllChapters(res.data.nextPageToken);
      } else {
        // If there's no 'nextPageToken,' assume that it's the last page.
        await getAllChaptersData();
      }
    } catch (err) {
      console.log(err);
    }
}

async function getTimecodeData () {
  /**
   * Flow to get all chapters:
   * - get all videos id
   * - from all that ids get video data
   * - return data
   */
  await getAllChapters()
}

// const fs = require('fs');

// async function uploadJsonFile() {
//   // await getTimecodeData();

// // Specify the path to your JSON file
// const filePath = './poplava.json';

// // Read the JSON file
// fs.readFile(filePath, 'utf8', (err, data) => {
//   if (err) {
//     console.error('Error reading JSON file:', err);
//     return;
//   }

//   try {
//     // Parse the JSON data
//     gav = JSON.parse(data)

//     const admin = require('firebase-admin');
// const serviceAccount = require('../../firebase-admin-key.json');

// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
// });

// const bucket = admin.storage().bucket('poplava-544f3.appspot.com');
// const fileName = 'poplava.json';

// // Convert the array to a JSON string
// // const jsonString = JSON.stringify([
// //   {
// //     id: 'ga12',
// //     name: 'gav',
// //   },
// // ]);

// // Create a buffer from the JSON string
// const buffer = Buffer.from(JSON.stringify(gav), 'utf-8');

// bucket
//   .file(fileName) // Specify the file in the bucket
//   .save(buffer, {
//     metadata: {
//       contentType: 'application/json',
//     },
//   })
//   .then(() => {
//     console.log(`Data uploaded to Firebase Storage successfully.`);
//   })
//   .catch((error) => {
//     console.error('Error uploading data to Firebase Storage:', error.message);
//   });


//   } catch (parseError) {
//     // console.error('Error parsing JSON:', parseError);
//   }
// });
// }
//2
// async function uploadJsonFile() {
//   await getTimecodeData();
//   const jsonString = JSON.stringify(gav);

//   const fileName = 'poplava.json'
//   // const storageRef = firebase.storage().ref();
//   // const fileRef = storageRef.child(fileName);

//   const fileRef = firebase.storage().ref().child(fileName);

//   // Upload JSON string directly
//   var blob = new Blob([jsonString], {type: "application/json"})

// fileRef.put(blob).then((snapshot) => {
//   console.log('Uploaded a blob or file!');
// });

//   console.log('JSON file uploaded successfully.');
// }

//33
// async function uploadJsonFile() {
//   await getTimecodeData();
//   const jsonString = JSON.stringify(gav);

//   const fileName = 'poplava.json'
//   const storageRef = firebase.storage().ref();
//   const fileRef = storageRef.child(fileName);

//   // Upload JSON string directly
//   var blob = new Blob([jsonString], {type: "application/json"})

// fileRef.put(blob).then(function(snapshot) {
//   console.log('Uploaded a blob!');
// });

//   console.log('JSON file uploaded successfully.');
// }

async function uploadJsonFile() {
  await getTimecodeData();
  // const jsonString = JSON.stringify(gav);


  const admin = require('firebase-admin');
  const serviceAccount = require('../../firebase-admin-key.json');

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  const bucket = admin.storage().bucket('poplava-544f3.appspot.com');
  const fileName = 'poplava.json';

  // Convert the array to a JSON string
  // const jsonString = JSON.stringify([
  //   {
  //     id: 'ga12',
  //     name: 'gav',
  //   },
  // ]);

  // Create a buffer from the JSON string
  const buffer = Buffer.from(gav, 'utf-8');

  bucket
    .file(fileName) // Specify the file in the bucket
    .save(buffer, {
      metadata: {
        contentType: 'application/json',
      },
    })
    .then(() => {
      console.log(`Data uploaded to Firebase Storage successfully.`);
    })
    .catch((error) => {
      console.error('Error uploading data to Firebase Storage:', error.message);
    });
}




// exports.handler = async function(event, context) {
const handler = async (event, context) => {
  try {
    console.log('start');
  await uploadJsonFile();
  // console.log(gav);
  console.log('finish');
  return {
    statusCode: 200,
    body: 'heelo'
  };
  } catch (e) {
    console.log({ e });
    return {
      statusCode: 500,
      message: e,
      body: 'heelo error'
    }
  }

  return {
    statusCode: 200,
  };
};
// exports.handler = schedule("@hourly", handler);
exports.handler = schedule("23 07  * * *", handler);
// exports.handler = schedule('58 22 * * *', exports.handler);
