twitter = {};

twitter.renderTweetText = function(text) {
 return text.replace(
               /((https?|s?ftp|ssh)\:\/\/[^"\s\<\>]*[^.,;'">\:\s\<\>\)\]\!])/g,
               function(link){
                  return '<a href="'+link+'">'+link+"</a>";
               }).replace(/\B@([_a-z0-9]+)/ig,
                  function(atuser){
                     return atuser.charAt(0)+
                     '<a href="http://www.twitter.com/'+
                     atuser.substring(1)+
                     '">'+
                     atuser.substring(1)+
                     "</a>";
                  }).replace(/\B#([_a-z0-9]+)/ig,
                    function(hashtag){
                      return '<a href="http://twitter.com/#!/search?q=%23'+
                        hashtag.substring(1) +
                        '">#'+
                        hashtag.substring(1) + '</a>';
                    });
}

/** borrowed from twitter API */
twitter.relative_time = function (C) {
         var A=Date.parse(C);
         var D=(arguments.length>1)?arguments[1]:new Date();
         var E=parseInt((D.getTime()-A)/1000);
         E=E+(D.getTimezoneOffset()*60);
         if(E<60) {
            return"less than a minute ago" 
         } else { 
            if(E<120) {
               return"about a minute ago"
            } else { 
               if(E<(60*60)){
                  return(parseInt(E/60)).toString() + " minutes ago" 
               } else {
                  if(E<(120*60)) { 
                     return"about an hour ago" 
                  } else {
                     if(E<(24*60*60)) {
                        return"about "+(parseInt(E/3600)).toString()+" hours ago"
                     } else {
                        if(E<(48*60*60))
                        {
                           return"1 day ago"
                        } else {
                           return(parseInt(E/86400)).toString()+" days ago"
                        }
                     }
                  }
               }
            }
         }
      };

twitter.renderTweet = function(tweet) {
  var result = ['<div class="tweet row">'];
  result.push('<div class="user span2 columns">');  
  if(tweet.profile_image_url) {
    result.push('<img src="');
    result.push(tweet.profile_image_url);
    result.push('"/>');
  }
  result.push(tweet.from_user);
  result.push('</div>');
  result.push('<div class="content span4 columns">');
  result.push(twitter.renderTweetText(tweet.text));
  result.push('     <a style="font-size:85%" href="http://twitter.com/');
  result.push(tweet.from_user);
  result.push('/statuses/');
  result.push(tweet.id);
  result.push('">');
  result.push(twitter.relative_time(tweet.created_at));
  result.push('</a>');
  result.push('</div>');
  result.push('</div>');
  return result.join('');
}

/**
 * Pulls from a twitter query stream and inserts tweets into the HTML.  Relies on no framework.
 * @param data
 *            The Twitter query result data
 */
function twitterCallback2(data) {
   var results = data.results;
   var tweets=[];
   for(var idx=0; idx < results.length && idx < 6; idx++) { 
         tweets.push('<li>',twitter.renderTweet(results[idx]),'</li>');
   }   
   document.getElementById("twitter_update_list").innerHTML=tweets.join("")
}

