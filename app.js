var fs = require("fs");
var sqlite3 = require("sqlite3");
var Tumblr = require("tumblrwks");
var config = require("./config.js");

config.file = "message.lid";
var dbFile = "/Library/Application Support/Skype/%user%/main.db";

config.skype.db = dbFile.replace("%user%", config.skype.userName);

console.log("opening DB file: ", process.env.HOME+config.skype.db);

var db = new sqlite3.Database(process.env.HOME + config.skype.db);
var sql = {
	id: "SELECT id FROM Messages WHERE convo_id = " + config.skype.convo_id + " ORDER BY id DESC LIMIT 0,1",
	messages: "SELECT body_xml FROM Messages WHERE convo_id = " + config.skype.convo_id + " AND id > ",
	lastMessageID: "select id from Messages order by id desc limit 1"
};

var regex = {
	hashtag: new RegExp(/[#]+[A-Za-z0-9-_]+/g),
	link: new RegExp(/href="([^"]*)"/)
};

var tumblr = new Tumblr(config.tumblr, config.tumblr.blog);

function checkLidFile(callback) {
	fs.exists(config.file, function(exists) {
		if (exists) {
			collectUrls();
		} else {
			db.each(sql.lastMessageID, function(err, result) {
				if (err) return;

				fs.writeFile(config.file, result);

				collectUrls();
			});
		}
	});
}

function collectUrls() {
	fs.readFile(config.file, "utf8", function(err, data) {
		if (err) return;
		db.get(sql.id, function(err, row) {
			if (err) return;
			fs.writeFile(config.file, row.id);
		});
		sql.messages += data;
		db.each(sql.messages, function(err, row) {
			if (err) return;
			var hashtags = row.body_xml.match(regex.hashtag);
			var link = row.body_xml.match(regex.link);
			if (hashtags && link) {
				console.log("hashtags", hashtags);
				console.log("link", link[1]);
				tumblr.post("/post", {
				type: "link",
				tags: hashtags.join(","),
				url: link[1]
			}, function(post) {
				console.log("post", post);
			});
			}
		});
	});
}

checkLidFile(collectUrls);