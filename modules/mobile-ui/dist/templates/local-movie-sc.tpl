<!-- local-movie-sc.tpl -->

<div class="{{#ifpref 'share_location' 'no'}}cqz-result-h2{{else}}cqz-result-h1{{/ifpref}} cqz-result-padding local-movie-result">

    <div class="meta">
        {{> logo}}
        {{#with data}}
        <div extra="url" class="card__meta"><div>{{friendly_url}}</div></div>
    </div>
    <div class="main">
        <div class="item">
          <div class="main__image" data-style="background-image: url({{movie.poster_img}});">
              Image
          </div>
          <h1 class="main__headline"><a href="{{url}}">{{ title }}</a></h1>
          <div class="main__meta">
            <span>
              {{#each stars}}
                  <span class='cqz-rating-star {{star_class}}'>★</span>
              {{/each}}
            </span>
          </div>

          {{#if movie.trailer_url}}
            <ul class="cta">
            <li
              arrow-override=''
              class="cqz-ez-btn movie-trailer-btn {{ ../../logo.buttonsClass }}"
              href="{{ movie.trailer_url }}"
              extra="movieSC_trailer"><a>
               {{local 'cqz_watch_trailer'}}</a>
            </li></ul>
          {{/if}}

          <div class="cinema-showtimes-container local-sc-data-container" id="cinema-showtimes-container">
            {{#if no_location }}
              {{#ifpref 'share_location' 'no'}}
                <div class="main__notifications">
                  {{>missing_location}}
                </div>
              {{/ifpref}}
            {{else}}
              {{>partials/timetable-cinema}}
            {{/if}}
          </div>

          <p class="main__content description">{{description}}</p>


        </div>

      </div>
    </div>
{{/with}}
