<div class="{{#ifpref 'share_location' 'no'}}cqz-result-h2{{else}}cqz-result-h1{{/ifpref}} cqz-result-padding local-movie-result">
  {{#with data}}
    <div class='cqz-movie-container'>
      <div class='movie_poster' extra="movie-sc-poster">
        <img src='{{movie.poster_img}}' class='movie_poster_img'/>
      </div>
      <div class='movie_data'>
        <div class="movie_title cqz-ez-title"><a extra="movie-sc-title" href="{{url}}">{{ emphasis title text 2 true }}</a></div>
        <div class="cqz-result-url movie_url">{{emphasis friendly_url text 2 true}}</div>
        <div class="movie_description cqz-multy-lines-ellipses cqz-line-vis-3">
            <p>
              <span>
                {{#each stars}}
                  <span class='cqz-rating-star {{star_class}}'>★</span>
                {{/each}}
              </span>
              <span class="movie_desc">
                {{description}}
              </span>
            </p>
        </div>
      </div>
    </div>
    <div class="cinema-showtimes-container local-sc-data-container" id="cinema-showtimes-container">
      {{#if no_location }}
        {{>partials/missing_location_1}}
      {{else}}
        {{>partials/timetable-cinema}}
      {{/if}}
    </div>
    {{#if movie.trailer_url}}
      <div
        arrow-override=''
        class="cqz-ez-btn movie-trailer-btn {{ ../../logo.buttonsClass }}"
        url="{{ movie.trailer_url }}"
        extra="movie-sc-trailer">
         {{local 'cqz_watch_trailer'}}
      </div>
    {{/if}}
  {{/with}}

  {{>logo}}
</div>
