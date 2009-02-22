/**
 * Pulls from a twitter query stream and inserts tweets into the HTML.  Relies on no framework.
 * @param data
 *            The Twitter query result data
 */
function twitterCallback2(data) {
   var results = data.results;
   var tweets=[];
   for(var idx=0; idx < results.length; idx++) { 
         var user=results[idx].from_user;
         var tweetHTML=results[idx].text.replace(
               /((https?|s?ftp|ssh)\:\/\/[^"\s\<\>]*[^.,;'">\:\s\<\>\)\]\!])/g,
               function(link){
                  return '<a href="'+link+'">'+link+"</a>"
               }).replace(/\B@([_a-z0-9]+)/ig,
                  function(atuser){
                     return atuser.charAt(0)+
                     '<a href="http://www.twitter.com/'+
                     atuser.substring(1)+
                     '">'+
                     atuser.substring(1)+
                     "</a>"
                  });
         tweets.push("<li><span>"+
               tweetHTML+
               '</span> <a style="font-size:85%" href="http://twitter.com/'+
               user+
               "/statuses/"+
               results[idx].id+
               '">'+
               relative_time(results[idx].created_at)+ 
               "</a></li>")
   }
   
   document.getElementById("twitter_update_list").innerHTML=tweets.join("")
}
/** borrowed from twitter API */
function relative_time(C) {
            var B=C.split(" ");
         C=B[1]+" "+B[2]+", "+B[5]+" "+B[3];
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