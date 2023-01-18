
(function() {
    // your page initialization code here
    // the DOM will be available here

    const toggler = document.querySelector(".toggler")
    console.log(toggler)
    toggler.addEventListener("click", function(e){
        var element = document.querySelector(".navbar");
        element.classList.toggle("active");
    }, false)
    
 })();