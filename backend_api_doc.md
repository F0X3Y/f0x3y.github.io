get_videos(url,page=1)
    lists video names (1 page is 3 videos, pages start from 1)
    to be used in to_thumbnail_link() and to_video_link()
    only returns videos of currently logged in user
    returns list of strings ["","",""]

    magyarul: 
     video lista
     1 oldal=3 video de tudom állítani ezt szerveren
     csak saját videóidat adja ki (amilyen néven be vagy jelentkezve)
     visszadob egy stringekkel teli listát ["név1","név2","valami"]
     to_thumbnail_link()-ben és to_video_link()-ben kell használni

     Amúgy meg valamiért sokkal könnyeb először angolul leírni utána magyarul nemtom miért

to_thumbnail_link(url,video_name)
    Turn video names into links to thumbnails (session token in link so it knows who is signed in)
    
    magyarul: videó nevéből csinál thumbnail linket (session token a linkben)

to_video_link(url,video_name)
    Turn video names into links to videos (session token in link so it knows who is signed in)
    
    magyarul: videó nevéből csinál video linket (session token a linkben)