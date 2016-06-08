<div class="cqz-result-h1 cqz-result-padding local-cinema-result local-movie-result">
  {{#with data}}
    <div class='cqz-cinema-container'>
      {{#if cinema.map_img}}
        <div class="cinema-image cqz-image-round" extra="cinema-sc-map-image">
          <img url="{{cinema.map_url}}" src="{{cinema.map_img}}"/>
        </div>
      {{/if}}
      <div class='cinema-data'>
        <div class="cinema_title cqz-ez-title">
          <a extra="cinema-sc-title" href="{{url}}">
            {{ emphasis cinema.name text 2 true }}
          </a>
        </div>
        <div class="cqz-result-url cinema_url">{{emphasis friendly_url text 2 true}}</div>
        <div class="cinema_description cqz-multy-lines-ellipses cqz-line-vis-3">
          <p>
            <span>
              {{#each stars}}
                <span class='cqz-rating-star {{star_class}}'>★</span>
              {{/each}}
            </span>
            <span class="movie_desc">
              {{cinema.desc}}
            </span>
          </p>
        </div>
      </div>
    </div>
    <div id="cinema-showtimes-container" class="cinema-showtimes-container local-sc-data-container">
      {{#if no_location }}
        {{> partials/missing_location_1}}
      {{else}}
        {{> partials/timetable-movie }}
      {{/if}}
    </div>
    <p>
      <a class="cqz-ez-btn cqz-cinema-program-btn" url="{{ cinema.cinepass_url }}" extra="cinema-sc-program">
        {{local 'cinema_program_btn'}}
      </a>
    </p>
  {{/with}}

  {{>logo}}
</div>
