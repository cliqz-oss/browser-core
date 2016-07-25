<div class="{{#ifpref 'share_location' 'no'}}cqz-result-h2{{else}}cqz-result-h1{{/ifpref}} cqz-result-padding local-movie-result">
  {{#with data}}
    <div class='movie_container'>
      <div class='movie_poster'>
        <img src='{{movie.poster_img}}' class='movie_poster_img'/>
      </div>
      <div class='movie_data'>
        <div class="movie_title cqz-ez-title"><a href="{{url}}">{{ emphasis title text 2 true }}</a></div>
        <div class="cqz-result-url movie_url">{{emphasis friendly_url text 2 true}}</div>
        <div class="movie_description">
          <div class="cqz-rd-max-lines4">
            <p>
              <span>
                {{#for 0 movie.rating 1}}
                  <span class='cqz-rating-star-on'>★</span>
                {{/for}}
                {{#for movie.rating 5 1}}
                  <span class='cqz-rating-star-off'>★</span>
                {{/for}}
              </span>
              <span class="movie_desc">
                {{description}}
              </span>
            </p>
          </div>

        </div>
      </div>
    </div>
    <div class="cinema-showtimes-container local-sc-data-container" id="cinema-showtimes-container">
      {{#if no_location }}
        {{#unlesspref 'share_location' 'no'}}
          {{>missing_location}}
        {{/unlesspref}}
      {{else}}
        {{#if cinemas}}
          {{>cinema_showtimes_partial}}
        {{else}}
          {{local 'no_cinemas_to_show'}}
        {{/if}}
      {{/if}}
    </div>
    {{#if movie.trailer_url}}
      <div
        arrow-override=''
        class="cqz-ez-btn movie-trailer-btn {{ ../../logo.buttonsClass }}"
        url="{{ movie.trailer_url }}">
         {{local 'cqz_watch_trailer'}}
      </div>
    {{/if}}
  {{/with}}


  {{>logo}}

</div>
