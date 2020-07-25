# ice candi - Multilingual Video Chat
### Deployed: https://fir-rtc-bf5c0.web.app/
### Demo video: https://www.youtube.com/watch?v=QaJl8ayN62E

## Introduction

This project is a multilingual peer-to-peer video chat application with live speech-to-text translation:
- Delivered a seamless video chat experience by implementing WebRTC negotiation mechanism using the 
Firestore database and React web app
- Empowered users to communicate through a humanized face-to-face / audial interaction and overcome 
language barriers using real-time speech-to-text translation between 8 languages powered by Azure Speech Translation API

## How to use
1. Choose an avatar and name!
2. Choose a country from the world map on the next page. Highlighted countries show that there is someone waiting for you! You can also start a chat by choosing a country that is not highlighted.
3. Once a peer arrives, start a chat! You can send a text, call and video chat! You have the option to translate what you say by selecting your speaking language and translated language.

## Technologies
### WebRTC
The web chat functionality (video, audio, text) was built by implementing the `WebRTC` protocol. `WebRTC` is a protocol that allows for direct peer-to-peer connections so that users can send and receive data without going through a central service. It is built into most browsers!

In order to start the peer-to-peer connection, however, the users need to first somehow find each other. This is done by a procedure known as "negotiation". For this, I needed to create a central service that users will first connect to and find out about each other. For this part, I decided to implement it with Google Firebase's Firestore database (discussed in the next section).

There were two great resources that I referenced to learn how the negotiation all works:
1. [Blog post][perfect-blog] by Mozilla that discusses a the "perfect negotiation" design, and some code samples.
2. [Developer documentation][perfect-docs] also by Mozilla that provides an updated version with even more code samples and comparisons to the previous implementation from the blog post.

After reading it multiple times over and testing one step at a time, I successfully implemented the `WebRTC` negotiation procedure with Firestore!

### Google Firebase/Firestore
I used the Firestore database as a way to implement the central service for `WebRTC` negotiation. One of the important requirements for negotiation is the ability for users to "listen" to changes in the central service. While there are alternatives such as `WebSocket` and `Socket.IO`, I went with Firestore because this way I didn't have to set up a dedicated server!

Firebase is very user-friendly, and I learned a lot from the documentation. In particular, [this documention](firebase-listen) provided a lot of information on how to "listen" for database changes.

### Microsoft Speech To Text Translation API
The most exciting feature on this project was the speech-to-text translation. During video chat, users are able to talk in any language they want to, and output the translated text in any language they choose. This was done by integrating with Microsoft's [Speech-to-text API][speech-text-api] offered by the Azure Cognitive Services team. I followed the documentation and sample on the [official Github page][cognitive-github] to understand and implement the feature.

### Frontend
The frontend was built using React, a popular javascript library for building Web applications. For the map, I used Mapbox.js and Leaflet, which are also popular libraries for map GUIs on the Web. Mapbox.js has a very rich set of APIs to customize the experience, and I read through [their documentation and examples][mapbox-examples] to find out how to make changes to the map such as changing the color of the country when the mouse hovered over it.

### Adobe Photoshop / Illustrator
I learned how to use Adobe Photoshop and Illustrator to create the avatars from scratch! I was inspired by [skribbl.io][skribbl] to create these avatars so that users can personalize the experience.

I started this project in March during my time at bootcamp, right as the world went into lockdown. My classmates and I stayed connected through activities such as [skribbl.io][skribbl]. I wanted to make my website just as fun and personalizable as well, and decided to make these avatars.

## Thanks!
Please check out my other projects at my [Portfolio Website][portfolio]!

[perfect-blog]: https://blog.mozilla.org/webrtc/perfect-negotiation-in-webrtc/
[perfect-docs]: https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation
[firebase-listen]: https://firebase.google.com/docs/firestore/query-data/listen
[speech-text-api]: https://azure.microsoft.com/en-us/services/cognitive-services/speech-to-text/
[cognitive-github]: https://github.com/Azure-Samples/cognitive-services-speech-sdk/tree/master/samples/js/browser
[mapbox-examples]: https://docs.mapbox.com/mapbox.js/example/v1.0.0/
[skribbl]: https://skribbl.io/
[portfolio]: https://akimi-yano.github.io/