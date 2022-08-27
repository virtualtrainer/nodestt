const DeepSpeech = require('deepspeech');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const Sox = require('sox-stream');
const MemoryStream = require('memory-stream');
const Duplex = require('stream').Duplex;
const Wav = require('node-wav');
const express = require('express');
const storage = multer.diskStorage({
	destination(req, file, cb) {
	  cb(null, 'audio/');
	},
	filename(req, file, cb) {
	  const fileNameArr = file.originalname.split('.');
	  cb(null, `${Date.now()}.${fileNameArr[fileNameArr.length - 1]}`);
	},
  });
  const upload = multer({ storage });
  
const app = express();
//app.use(express.static('public/assets'));
app.use(express.static('audio'));
const port = 8080;
app.listen(process.env.PORT || port,()=> {
//console.log('listen port 8040');
});

app.post('/record', upload.single('audio'), (req, res) => res.json({ success: true }));

app.get('/recordings', (req, res) => {
	let files = fs.readdirSync(path.join(__dirname, 'audio'));
	files = files.filter((file) => {
	  // check that the files are audio files
	  const fileNameArr = file.split('.');
	  return fileNameArr[fileNameArr.length - 1] === 'wav';
	}).map((file) => `/${file}`);
	return res.json({ success: true, files });
  });

app.get('/hello_world', (req,res)=>{
	

	let modelPath = './models/deepspeech-0.9.3-models.pbmm';

let model = new DeepSpeech.Model(modelPath);

let desiredSampleRate = model.sampleRate();

let scorerPath = './models/deepspeech-0.9.3-models.scorer';

model.enableExternalScorer(scorerPath);

let audioFile = process.argv[2] || './audio/dude3.wav';

if (!fs.existsSync(audioFile)) {
	console.log('file missing:', audioFile);
	process.exit();
}

const buffer = fs.readFileSync(audioFile);
const result = Wav.decode(buffer);

if (result.sampleRate < desiredSampleRate) {
	console.error('Warning: original sample rate (' + result.sampleRate + ') is lower than ' + desiredSampleRate + 'Hz. Up-sampling might produce erratic speech recognition.');
}

function bufferToStream(buffer) {
	let stream = new Duplex();
	stream.push(buffer);
	stream.push(null);
	return stream;
}

let audioStream = new MemoryStream();
bufferToStream(buffer).
pipe(Sox({
	global: {
		'no-dither': true,
	},
	output: {
		bits: 16,
		rate: desiredSampleRate,
		channels: 1,
		encoding: 'signed-integer',
		endian: 'little',
		compression: 0.0,
		type: 'raw'
	}
})).
pipe(audioStream);

audioStream.on('finish', () => {
	let audioBuffer = audioStream.toBuffer();
	
	const audioLength = (audioBuffer.length / 2) * (1 / desiredSampleRate);
	//console.log('audio length', audioLength);
	
	let result = model.stt(audioBuffer);
	
	//console.log('result:', result);
	res.send(result);
});

	

});

