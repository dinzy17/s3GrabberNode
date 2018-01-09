var express = require('express')
var app = express()
var async = require('async')
var AWS = require('aws-sdk')
var s3 = require('s3')
var s3ls = require('s3-ls')
var bodyParser = require('body-parser');

var s3Options = {
    accessKeyId: "Enter your accessKeyId",
    secretAccessKey: "Enter your secretAccessKey",
    region: "Enter Region",
    bucket: "Enter Bucket Name"
}
var lister = s3ls(s3Options)

var client = s3.createClient({
  s3Options: s3Options
})

app.set('view engine', 'ejs')
app.set('views', __dirname + '/views')
app.use(bodyParser.urlencoded({ extended: false,keepExtensions: true, uploadDir: "/uploads/images"  }));
app.use(bodyParser.json());

app.get('/', function(req, res) {
  res.render('index')
})
app.post('/', function (req, res) {
  var pathToDownload = req.body.pathToDownload.replace(/^\//,'').trim()
   if(pathToDownload !== '' && req.body.extensions.trim() !== '') {
     var params = {
      s3Params: {
        Bucket: s3Options.bucket, /* required */
        Delimiter: '/',
        Prefix: pathToDownload,
        EncodingType: "url"
      },
      recursive: true
    }
    var listData = []
    var list = client.listObjects(params)
    list.on('data',function(data) {
      listData = listData.concat(data.Contents)
    })
    var downloadedFiles = []
    list.on('end', function(){
      var extensions = req.body.extensions.toLowerCase().split(',').map(function(item) {
        return item.trim()
      })
      async.forEach(listData, function(content,callback) {
        var filePath = content.Key
        var dirStruct = filePath.split('/')
        var fileName = dirStruct[dirStruct.length - 1]
        var fileNameSplit = fileName.split('.')
        var fileExtension = fileNameSplit[fileNameSplit.length - 1].toLowerCase()
        if(extensions.indexOf(fileExtension) > -1 && filePath[filePath.length - 1] !== '/') {
          var params = {
          localFile: "exports/"+filePath,
          s3Params: {
              Bucket: s3Options.bucket, /* required */
              Key: filePath
            }
          }
          var downloader = client.downloadFile(params);
          downloader.on('error', function(err) {
            console.error("unable to download file %s: %s", fileName, err.stack)
            callback()
          })
          downloader.on('end', function() {
            downloadedFiles.push(filePath)
            callback()
          })
        } else {
          callback()
        }
      }, function(){
        res.send('<b>Downloaded files are : </b><br/><br/>' + downloadedFiles.join('<br/>') + 
                 '<br/> <br/> <a href="/">Return to Form</a>')
      }) //end of async
    })
  } else {
    res.redirect('/')
  }
})

var server = app.listen(8081, function() {
   console.log("Example app listening at port %s", server.address().port)
})