
<!-- local-cinema-sc.tpl -->

<div class="{{#ifpref 'share_location' 'no'}}cqz-result-h2{{else}}cqz-result-h1{{/ifpref}} cqz-result-padding local-cinema-result local-movie-result">
    <div class="meta">
        {{> logo}}
    {{#with data}}
    
        
            <h3 class="meta__url"><i class="fa fa-mobile mobile"></i> {{emphasis friendly_url query 2 true}}</h3>
        </div>
    
        <div class="main">
            <h1 class="main__headline"><a href="{{url}}">{{ cinema.name }}</a></h1>
            <div class="main__meta">
              <span>
                {{#each stars}}
                  <span class='cqz-rating-star {{star_class}}'>★</span>
                {{/each}}
              </span>
            </div>
            <div class="cinema-showtimes-container local-sc-data-container" id="cinema-showtimes-container">
              {{#if no_location }}
                  {{>missing_location}}
              {{else}}
              {{distance cinema.distance}}
                {{>partials/timetable-movie}}
              {{/if}}
            </div>
            
            <p class="main__content description">{{{cinema.desc}}}</p>
            
            <ul class="cta">
                  <li><a xmlns="http://www.w3.org/1999/xhtml" arrow-override=""
     class="cqz-ez-btn cqz-cinema-program-btn"
     url="{{ cinema.cinepass_url }}"
     extra="cinemaSC_program"
>
    {{local 'cinema_program_btn'}}
</a></li>
            </ul>
        </div>
    
    {{/with}}

</div>
