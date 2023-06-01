module.exports = function (app) {
  var fs = require("fs");
  var admin = require("firebase-admin");
  var firebaseRef = db.ref("main");
  
  var timeAgo = require('node-time-ago');
  const cookieParser = require("cookie-parser");
  
  var journalRef = firebaseRef.child("journal");
  var signUpRef = firebaseRef.child("sign-up");
  var moodRef = firebaseRef.child("mood_tracker");
  var forumDataRef1 = firebaseRef.child("forumData");
  var forumRef = firebaseRef.child("forum");
  var signUpRef = firebaseRef.child("sign-up");
  var tipsRef = firebaseRef.child("tips");

  var DateUtil = require("./util/dateUtil.js");
  var dateUtil = new DateUtil();

  var userID;

  app.use(cookieParser());

  app.get("/homepage", function (req, res) {
    var forumListRef = forumRef;
    var forumList = [];
    
    forumListRef.on('value', (data) => {
      data.forEach(function (snapshot) {
        forumList.push(snapshot.val());
      })
    });
    
    res.render("homepage.html", { forumItem: forumList });
  });

  app.get("/journal", function (req, res) {

    // variable to check if user has entered their daily journal
    var isDailyEntryDone = false;
    // variable containing the date of the latest journal
    var latestDate = "";
    // array containing all previously user entered journals
    var userJournalEntries = [];
    // array containing all day numbers for all user entered journal
    var dayNums = [];

    journalRef
      .child(userID)
      .get()
      .then((snapshot) => {
        if (snapshot.exists()) {
          let journalDataObj = JSON.parse(JSON.stringify(snapshot.val()));
          for (let i in journalDataObj) {
            userJournalEntries.push(journalDataObj[i]);
            dayNums.push(parseInt(journalDataObj[i].dayNum));
          }

          // sort entries in descending order
          userJournalEntries.sort(function (a, b) {
            return b.dayNum - a.dayNum;
          });

          // get latest date by getting object with the latest dayNum
          var maxDayNum = Math.max(...dayNums);
          for (let i in userJournalEntries) {
            if (userJournalEntries[i].dayNum === maxDayNum) {
              latestDate = userJournalEntries[i].dateAdded;
              break;
            }
          }

          // check if daily journal has been added for today,
          // by checking if the latest journal entry date is today
          isDailyEntryDone = dateUtil.isDateToday(latestDate);

          res.render("journal.html", {
            userJournalEntriesData: userJournalEntries,
            dailyEntryDone: isDailyEntryDone,
            latestDayNum: maxDayNum,
          });
        } else {
          console.log("No data available");
          res.render("journal.html", { latestDayNum: 0 });
        }
      })
      .catch((error) => {
        console.error(error);
        res.redirect("/");
      });
  });

  app.post("/addjournalentry", function (req, res) {

    journalRef
      .child(userID)
      .push()
      .set(
        {
          userID: userID,
          dateAdded: dateUtil.formatDate(Date()),
          content: req.body.journalContent,
          dayNum: parseInt(req.body.dayNum),
        },
        (error) => {
          if (error) {
            console.error(error);
            res.redirect("/");
          }
        }
      );

      res.redirect("journal");
  });

  app.post("/editjournalentry", function (req, res) {

    journalRef
      .child(userID)
      .get()
      .then((snapshot) => {
        if (snapshot.exists()) {
          let journalDataObj = JSON.parse(JSON.stringify(snapshot.val()));

          for (let i in journalDataObj) {
            if (journalDataObj[i].dayNum == req.body.dayNum) {
              journalRef
                .child(userID)
                .child(i)
                .set({
                  userID: userID,
                  dateAdded: req.body.dateAdded,
                  content: req.body.journalContent,
                  dayNum: parseInt(req.body.dayNum),
                });

                res.redirect("journal");
            }
          }
        } else {
          console.log("something went wrong");
          res.redirect("/");
        }
      })
      .catch((error) => {
        console.error(error);
        res.redirect("/");
      });
  });

  ///////////////////////////////////////////////////////SIGN IN AND SIGN UP///////////////////////////////////////////////////////////////////////////
    app.get("/", function (req, res) {
      res.render("welcomepage.html"); 
    });

    app.get("/welcomepage", function (req, res) {
      res.render("welcomepage.html")
    });

    app.get("/journal", function (req, res) {
      res.render("journal.html");
    });
    
    app.get("/signIn", function (req, res) {
      res.render('signIn.html');
    });

    app.post("/signIn", function(req,res){
      res.render("signIn.html");
    });

    //saving sign-up to database

    app.post('/sign_up', function (req, res) {
    
      admin
          .auth()
          .createUser({
            "email" : req.body.email,
            "password" : req.body.password
          })
          .then((userData) => {
            
            signUpRef.child(userData.uid).set({
              "userID": userData.uid,
              "name" : req.body.name,
              "email" : req.body.email,
              // "password" : req.body.password,
              "username" : req.body.user_name,
              "birthday" : req.body.birthday,
              "age" : req.body.age,
              "phone_number" : req.body.phone_number,
              "educational_level" : req.body.educational_level,
              "school": req.body.school,
              "numOfForum": 0,
              "numOfcomments": 0,
              "dateJoined": new Date()
          });
          forumDataRef1.once('value')
            .then((querySnapshot) => {
              if (!querySnapshot.numChildren()) {
                throw new Error('expected at least one result');
              }
                          
              if (!querySnapshot.exists()) {
                throw new Error(`Entry ${forumId} not found.`);
              }

              var TotalUser = querySnapshot.val().TotalUser;
              updateTotal = TotalUser + 1;
              forumDataRef1.update({
                TotalUser: updateTotal
              })
              
            });
          res.render("signIn.html");
       
        })
        .catch((error) => {
            // console.log('Error creating userr:',error);
            var errorCode = error.code;
            var err = error.message;
            console.log(errorCode)
            console.log(err)
            res.send({err: err });
        });
      
    });

    app.all("*", (req, res, next) => {
      res.cookie("XSRF-TOKEN");
      next();
    });
      
    app.post("/sessionLogin", (req, res,next) => {
      const idToken = req.body.idToken.toString();
    
      const expiresIn = 60 * 60 * 24 * 5 * 1000;
    
      admin
        .auth()
        .createSessionCookie(idToken, { expiresIn })
        .then((sessionCookie) => {
            const options = { maxAge: expiresIn, httpOnly: true };
            res.cookie("session", sessionCookie, options);
            res.end(JSON.stringify({ status: "success" }));
          },
          // (error) => {
          //   res.status(401).send("UNAUTHORIZED REQUEST!");
          // }
          )
    });
    
    app.get("/sessionLogout", (req, res) => {
      userID = 0;
      res.clearCookie("session");
      res.redirect("/");
    });
  /////////////////////////////////////////////////////// TIPS ///////////////////////////////////////////////////////////////////////////
  app.get("/tips", function (req, res) {
    tipsRef
      .once("value", (snapshot) => {
        if (snapshot.exists()) {
          var tips = snapshot.val();
          console.log(tips);
          res.render("tips.html", { tipsData: tips });
        } else {
          console.log("No data available");
        }
      })
      .catch((error) => {
        console.error(error);
      });
  });
  
  
  app.get("/profile", function (req, res) {
    const sessionCookie = req.cookies.session || "";

    admin
      .auth()
      .verifySessionCookie(sessionCookie, true /** checkRevoked */)
      .then((userData) => {
        userID = userData.uid;
        req.cookies.userID = userData.uid;
        console.log("uid: " + userData.uid);
        console.log("Test: " + req.cookies.userID);
        console.log("Logged in:", userData.email);
        // test
        thisUserRef = signUpRef.child(userID);
        thisUser = [];
        // console.log("profile::" + thisUser);
        thisUserRef.once('value')
          .then((querySnapshot) => {
              if (!querySnapshot.numChildren()) { 
                        throw new Error('expected at least one result');
              }
              
              if (!querySnapshot.exists()) { 
                throw new Error(`Entry ${userID} not found.`);
              }
            
            var username = querySnapshot.val().name;
            var email = querySnapshot.val().email;
            var name = querySnapshot.val().username;
            var educational_level = querySnapshot.val().educational_level;
            var age = querySnapshot.val().age;
            var phone_number = querySnapshot.val().phone_number;
            var school = querySnapshot.val().school;

            res.render("profile.html", {
                    userFullName: username,
                    userEmail: email,
                    userUsername: name,
                    userEducationalLevel: educational_level,
                    age: age,
                    userPhoneNumber: phone_number,
                    userSchool: school
                  });
          
        }).catch((error) => {
            console.error(error);
        });
      });
  });
  
  app.get("/topNav", function (req, res) {
    res.render("topNav.html", {
      title: "Dynamic title"
    });
  });

  app.get("/forumNav", function (req, res) {
    res.render("forum_nav.html", {
      title: "Dynamic title"
    });
  });

  //ROUTE DIRECT TO EACH FORUM || GET FORUM ITEMS
  app.get("/eachForum", function (req, res) {
    var forumId = req.query.forumId;
    var forumDataRef = forumRef;
   
            forumDataRef.child(forumId).once('value')
              .then((querySnapshot) => {
                if (!querySnapshot.numChildren()) {
                  throw new Error('expected at least one result');
                }
                    
                if (!querySnapshot.exists()) {
                  throw new Error(`Entry ${forumId} not found.`);
                }

                var forumTitle = querySnapshot.val().forumTitle;
                var currentTime = querySnapshot.val().currentTime;
                var numOfLikes = querySnapshot.val().numOfLikes;
                var numOfReplies = querySnapshot.val().numOfReplies;
                var numOfViews = querySnapshot.val().numOfViews;
                var forumContent = querySnapshot.val().forumContent;
                var uploader = querySnapshot.val().username;
              
                let timePast = timeAgo(currentTime);
              
                var viewCount = numOfViews;
                updatedViewCount = viewCount + 1;
                var ref = forumRef.child(forumId);
                    
                ref.update({
                  numOfViews: updatedViewCount
                });

                var repliesRef = forumRef.child(forumId).child("forumReplies");
                var replyPost = repliesRef;
                var forum_replies = [];
                    

                replyPost.on('value', (data) => {
                  data.forEach(function (snapshot) {
                    forum_replies.push(snapshot.val());
                  })
                });
                console.log(replyPost);
                res.render("eachForum.html", { replyPosts: forum_replies, forumId: forumId, forumTitle: forumTitle, uploader: uploader, currentTime: currentTime, numOfLikes: numOfLikes, numOfReplies: numOfReplies, forumContent: forumContent, numOfViews: numOfViews });
              })
              .catch((error) => {
                console.log("Unexpected error:", error);
              })


  });

  app.post("/addLikeForum", function (req, res) {
    forumId = req.body.forumId;
    console.log("like" + forumId);
    var forumDataRef = forumRef;
    forumDataRef.child(forumId).once('value')
      .then((querySnapshot) => {
        if (!querySnapshot.numChildren()) { // handle rare no-results case
          throw new Error('expected at least one result');
        }
        if (!querySnapshot.exists()) { // value may be null, meaning idToFind doesn't exist
          throw new Error(`Entry ${forumId} not found.`);
        }

        var numOfLikes = querySnapshot.val().numOfLikes;
        var forumLikes = numOfLikes + 1;

    
        forumRef.child(forumId).update({
              
          numOfLikes: forumLikes,
              
        });

        // thisUserRef.child("userForum").update({
        //   numOfLikes: forumLikes,
        // });
          
        res.redirect('back');
      }).catch((error) => {
        console.error(error);
      });
  });

  

  //ADD REPLY TO FIREBASE
 app.post("/addReply", function (req, res) {
    const sessionCookie = req.cookies.session || "";

    forumId = req.body.forumId;
    reply = req.body.userReply;
    let currentTime = new Date();

    admin
      .auth()
      .verifySessionCookie(sessionCookie, true /** checkRevoked */)
      .then((userData) => {
        userID = userData.uid;
        req.cookies.userID = userData.uid;
   
        // test
        thisUserRef = signUpRef.child(userID);
        thisUser = [];
        thisUserRef.once('value')
          .then((querySnapshot) => {
              if (!querySnapshot.numChildren()) { 
                        throw new Error('expected at least one result');
              }
              
              if (!querySnapshot.exists()) { 
                throw new Error(`Entry ${userID} not found.`);
              }
            var username = querySnapshot.val().name;

      
            var ref = forumRef.child(forumId).child("forumReplies"); 
            var newforumList = ref.push();
            newforumList.set({ 
              forumReplyId: newforumList.key,
              username: username,
              reply: reply,
              currentTime: currentTime
            });

            var forumListRef = ref;
            var forum_replies = [];
            

            forumListRef.on('value', (data) => { 
              data.forEach(function (snapshot) {
                forum_replies.push(snapshot.val());
              })
            });

            var forumDataRef = forumRef;
            forumDataRef.child(forumId).once('value')
              .then((querySnapshot) => {
                if (!querySnapshot.numChildren()) { // handle rare no-results case
                  throw new Error('expected at least one result');
                }
                if (!querySnapshot.exists()) { // value may be null, meaning idToFind doesn't exist
                  throw new Error(`Entry ${forumId} not found.`);
                }
                var numOfReplies = querySnapshot.val().numOfReplies;
          
                var repliesCount = numOfReplies;
                updated_replies_count = repliesCount + 1;
                var forum_post_ref = forumRef.child(forumId);
                
                forum_post_ref.update({
                    numOfReplies:  updated_replies_count   
                });

                
  

                
              })
            
            forumDataRef1.once('value')
              .then((querySnapshot) => {
                if (!querySnapshot.numChildren()) {
                  throw new Error('expected at least one result');
                }
                            
                if (!querySnapshot.exists()) {
                  throw new Error(`Entry ${forumId} not found.`);
                }

                var Totalcomments = querySnapshot.val().Totalcomments;

                

                updateTotal = Totalcomments + 1;

                forumDataRef1.update({
                  Totalcomments: updateTotal
                })
                
              });
            
          });
       res.redirect('back');

      });
    });


    //ROUTE DIRECT TO FORUM MAIN PAGE ||GET ALL DATA FROM DB TO DISPLAY
  app.get("/forum_mainpage", function (req, res) {
      var forumListRef = forumRef;
      var forumList = [];

      forumListRef.on('value', (data) => {
        data.forEach(function (snapshot) {
          forumList.push(snapshot.val());
        })
      });

     forumDataRef1.once('value')
      .then((querySnapshot) => {
        if (!querySnapshot.numChildren()) {
          throw new Error('expected at least one result');
        }
                    
        if (!querySnapshot.exists()) {
          throw new Error(`Entry ${forumId} not found.`);
        }

        var totalForum = querySnapshot.val().totalForum;
        var totalComments = querySnapshot.val().Totalcomments;
        var totalUsers = querySnapshot.val().TotalUser;
      
    
        res.render("forumpage.html", {
          title: "Dynamic title", forumItem: forumList, totalForum: totalForum, totalComments: totalComments, totalUsers: totalUsers
        });
      });
    });

    //ADD FORUM ITEMS INTO FIREBASE
 app.post("/addForumItem", function (req, res) {
    const sessionCookie = req.cookies.session || "";

    admin
      .auth()
      .verifySessionCookie(sessionCookie, true /** checkRevoked */)
      .then((userData) => {
        userID = userData.uid;
        req.cookies.userID = userData.uid;
        // test
        thisUserRef = signUpRef.child(userID);
        thisUser = [];
        thisUserRef.once('value')
          .then((querySnapshot) => {
            if (!querySnapshot.numChildren()) {
              throw new Error('expected at least one result');
            }
              
            if (!querySnapshot.exists()) {
              throw new Error(`Entry ${userID} not found.`);
            }
            
            var username = querySnapshot.val().name;
            var numOfForum = querySnapshot.val().numOfForum;

            var newforumList = forumRef.push();
            newforumList.set({
              forumId: newforumList.key,
              username: username,
              forumTitle: req.body.forum_name,
              forumContent: req.body.forum_content,
              numOfLikes: 0,
              numOfViews: 0,
              numOfReplies: 0,
              currentTime: new Date()
            });

            var numForum = numOfForum + 1;

            thisUserRef.update({
              numOfForum: numForum
            });

            thisUserRef.child("userForum").push().set({
              
              forumId: newforumList.key,
              username: username,
              forumTitle: req.body.forum_name,
              forumContent: req.body.forum_content,
              numOfLikes: 0,
              numOfViews: 0,
              numOfReplies: 0,
              currentTime: new Date()
              
            });

          }).catch((error) => {
            console.error(error);
          });
      });
    
    var forumListRef = forumRef;
    var forumList = [];

    forumListRef.on('value', (data) => {
      data.forEach(function (snapshot) {
        forumList.push(snapshot.val());
      })
    });
    
    forumDataRef1.once('value')
      .then((querySnapshot) => {
        if (!querySnapshot.numChildren()) {
          throw new Error('expected at least one result');
        }
                    
        if (!querySnapshot.exists()) {
          throw new Error(`Entry ${forumId} not found.`);
        }

        var totalForum = querySnapshot.val().totalForum;

        

         updateTotal = totalForum + 1;

        forumDataRef1.update({
          totalForum: updateTotal
        })
        
      });
  
             

      res.redirect('back');
    });
    //REGISTER
    app.post('/registerUser', function (req, res, next) {
      var email = req.body.email;
      var password = req.body.password;

      admin
        .auth()
        .createUser({
          email: email,
          password: password,
        })
        .then((userRecord) => {
          console.log('Successfully created new user:', userRecord.uid);
          signUpRef.push().set({
            "userID": userRecord.uid,
            "email": email,
          });
        })
        .catch((error) => {
          console.log('Error creating new user:', error);
        });
    });
  
    
    //-----mood_tracker-----
    //insert happy mood
    app.get("/happy", function (req, res) {
      console.log("mood = happy")
      username = userID;
      mood = "happy";
      
      currentTime = new Date();
      let date = ("0" + currentTime.getDate()).slice(-2);
      let month = ("0" + (currentTime.getMonth() + 1)).slice(-2);
      let year = currentTime.getFullYear();
      let currentDate = date + + month + year;
      
      var userMood = moodRef.child(username).child(currentDate).child("today_mood");
      userMood.once('value') 
        .then((querySnapshot) => {
          var a = querySnapshot.exists();          //querySnapshot.exists(); -- when query is empty -- false || when query is not empty -- true
            if (a == true) {
                userMood.set({     
                    username: "user 1",
                    mood: mood,
                    currentTime: currentDate
                });
            } else if (a == false) {
                userMood.set({     
                    username: "user 1",
                    mood: mood,
                    currentTime: currentDate
                });
            } else {
              console.log("error adding mood")
            }
          });
      res.redirect('back');
    });


    //insert mad mood
    app.get("/mad", function (req, res) {
      console.log("mood = mad")
      username = userID;
      mood = "mad";
    
      currentTime = new Date();
      let date = ("0" + currentTime.getDate()).slice(-2);
      let month = ("0" + (currentTime.getMonth() + 1)).slice(-2);
      let year = currentTime.getFullYear();
      let currentDate = date + + month + year;
      
      var userMood = moodRef.child(username).child(currentDate).child("today_mood");
      userMood.once('value') 
        .then((querySnapshot) => {
          var a = querySnapshot.exists(); //querySnapshot.exists(); -- when query is empty -- false || when query is not empty -- true
            if (a == true) {
              userMood.set({     
                username: "user 1",
                mood: mood,
                currentTime: currentDate     
              });
            } else if (a == false) {
              userMood.set({     
                  username: "user 1",
                  mood: mood,
                  currentTime: currentDate
              });
            } else {
              console.log("error adding mood")
            }
          
        });
      res.redirect('back');
    });

    //insert sad mood   
    app.get("/sad", function (req, res) {
      console.log("mood = sad")
      username = userID;
      mood = "sad";
      
      currentTime = new Date();
      let date = ("0" + currentTime.getDate()).slice(-2);
      let month = ("0" + (currentTime.getMonth() + 1)).slice(-2);
      let year = currentTime.getFullYear();
      let currentDate = date + + month + year;
      
      var userMood = moodRef.child(username).child(currentDate).child("today_mood");
      userMood.once('value') 
        .then((querySnapshot) => {
          var a = querySnapshot.exists(); //querySnapshot.exists(); -- when query is empty -- false || when query is not empty -- true
          console.log(a);
            if (a == true) {       
              userMood.set({     
                username: "user 1",
                mood: mood,
                currentTime: currentDate   
            });
            } else if (a == false) {
              userMood.set({     
                  username: "user 1",
                  mood: mood,
                  currentTime: currentDate     
              });
            } else {
              console.log("error adding mood")
            }
          });
      res.redirect('back');
    });

    //insert cool mood 
    app.get("/cool", function (req, res) {
      console.log("mood = cool")
      username = userID;
      mood = "cool";
      
      currentTime = new Date();
      let date = ("0" + currentTime.getDate()).slice(-2);
      let month = ("0" + (currentTime.getMonth() + 1)).slice(-2);
      let year = currentTime.getFullYear();
      let currentDate = date + + month + year;
      
      
      var userMood = moodRef.child(username).child(currentDate).child("today_mood");
      userMood.once('value') 
        .then((querySnapshot) => {
          var a = querySnapshot.exists(); //-- when query is empty -- false || when query is not empty -- true
            if (a == true) {
              userMood.set({     
                username: "user 1",
                mood: mood,
                currentTime: currentDate             
            });
            } else if (a == false) {
              userMood.set({     
                  username: "user 1",
                  mood: mood,
                  currentTime: currentDate 
              });
            } else {
              console.log("error adding mood")
            }
          });
      
      res.redirect('back');
    });

    //route to mood_tracker || insert neutral moods to display on the html calendar
    app.get("/neutral", function (req, res) {
      console.log("mood = neutral")
      username = userID;
      mood = "neutral";
      
      currentTime = new Date();
      let date = ("0" + currentTime.getDate()).slice(-2);
      let month = ("0" + (currentTime.getMonth() + 1)).slice(-2);
      let year = currentTime.getFullYear(); 
      let currentDate = date + + month + year;
      
      var userMood = moodRef.child(username).child(currentDate).child("today_mood");
      userMood.once('value') 
        .then((querySnapshot) => {
          var a = querySnapshot.exists();//-- when query is empty -- false || when query is not empty -- true
            if (a == true) {              
              userMood.set({     
                username: "user 1",
                mood: mood,
                currentTime: currentDate              
            });
            } else if (a == false) {
              userMood.set({     
                  username: "user 1",
                  mood: mood,
                  currentTime: currentDate                
              });
            } else {
              console.log("error adding mood")
            }
        });
      
      res.redirect('back');
    });
      

    //insert getting mood 
    app.get("/mood_tracker", function (req, res) {
      //username = "user 1";
      username = userID;
      currentTime = new Date();
      let date = ("0" + currentTime.getDate()).slice(-2);
      let month = ("0" + (currentTime.getMonth() + 1)).slice(-2);
      let year = currentTime.getFullYear(); 
      let currentDate = date + + month + year;

      var today_mood = "empty";
      var prev_moods = {};

      moodRef.child(username).get().then((snapshot) => {
        if(snapshot.exists()) {

          let moodDataObj = JSON.stringify(snapshot.val());
          moodDataObj = JSON.parse(moodDataObj);

          

          for(let i in moodDataObj) {
            
            if(i != currentDate) {
              prev_moods[i] = moodDataObj[i].today_mood.mood;
            }
            else {
              var moodObj = moodDataObj[i].today_mood;
              today_mood = moodObj.mood;
            }
          }

          res.render("mood_tracker.html", {
            title: "Dynamic title", 
            today_mood : today_mood,
            prev_moods : prev_moods
          });

        }
        else {
          console.log("No data available");
          res.render("mood_tracker.html", {
            title: "Dynamic title", 
            today_mood : today_mood,
            prev_moods : prev_moods
          });
        }
      })
      .catch((error) => {
        console.error(error);
        res.redirect("/");
      });
      
      
    });

};
