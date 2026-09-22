(function () {
  "use strict";

  // Real, openly released Blender films. The primary player uses stream-ready
  // MP4 mirrors and can fail over to a second host when one is unavailable.
  window.NEO_MOVIES_CATALOG = [
    {
      id: "open-big-buck-bunny",
      title: "Big Buck Bunny",
      type: "movie",
      year: "2008",
      genre: "Animation",
      maturity: "ALL",
      rating: "",
      description: "A gentle giant decides it is time to outsmart the woodland troublemakers who keep testing his patience.",
      poster: "",
      backdrop: "",
      media: "https://archive.org/download/BigBuckBunny_328/BigBuckBunny_512kb.mp4",
      mediaFallbacks: ["https://media.w3.org/2010/05/video/movie_300.mp4"],
      officialUrl: "https://studio.blender.org/projects/big-buck-bunny/",
      openSample: true
    },
    {
      id: "open-sintel",
      title: "Sintel",
      type: "movie",
      year: "2010",
      genre: "Fantasy",
      maturity: "PG",
      rating: "",
      description: "A young warrior crosses a dangerous world while searching for the dragon she once rescued.",
      poster: "",
      backdrop: "",
      media: "https://archive.org/download/Sintel/sintel-2048-surround_512kb.mp4",
      mediaFallbacks: ["https://media.w3.org/2010/05/sintel/trailer.mp4"],
      officialUrl: "https://studio.blender.org/projects/sintel/",
      openSample: true
    },
    {
      id: "open-tears-of-steel",
      title: "Tears of Steel",
      type: "movie",
      year: "2012",
      genre: "Science fiction",
      maturity: "PG-13",
      rating: "",
      description: "Scientists and fighters reunite in a future Amsterdam for one last attempt to prevent a robot catastrophe.",
      poster: "",
      backdrop: "",
      media: "https://archive.org/download/Tears-of-Steel/tears_of_steel_720p.mp4",
      mediaFallbacks: ["https://download.blender.org/demo/movies/ToS/tears_of_steel_720p.mov"],
      officialUrl: "https://studio.blender.org/projects/tears-of-steel/",
      openSample: true
    },
    {
      id: "open-elephants-dream",
      title: "Elephants Dream",
      type: "movie",
      year: "2006",
      genre: "Science fiction",
      maturity: "PG",
      rating: "",
      description: "Two explorers move through a vast mechanical world while disagreeing about what that strange machine really means.",
      poster: "",
      backdrop: "",
      media: "https://archive.org/download/ElephantsDream/ed_hd_512kb.mp4",
      mediaFallbacks: ["https://download.blender.org/ED/elephantsdream-480-h264-st-aac.mov"],
      officialUrl: "https://studio.blender.org/projects/elephants-dream/",
      openSample: true
    }
  ];
  window.NEO_STREAM_CATALOG = window.NEO_MOVIES_CATALOG;
})();
