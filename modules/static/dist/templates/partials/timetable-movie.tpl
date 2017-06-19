<div class="cqz-movie-playing">
    {{local 'now_playing_in_cinema'  }}
</div>
<table class="cinema-showtimes-table">
    <tr>
        <th class="showtimes-date" colspan="0">
            {{local display_date.day_of_week}}, {{display_date.day_of_month}}. {{local display_date.month}}
        </th>
    </tr>
    {{#each movies }}
        <tr class="cinema-row">
            <td class="cinema-name-td">
                <a class="cinema-name cqz-url"
                   {{#if movie.cinepass_url}}
                     url="{{movie.cinepass_url}}"
                     show-status='true'
                     href="{{ movie.cinepass_url }}"
                   {{/if}}
                   extra="cinemaSC_movie_name"
                >
                    {{ movie.name }}
                </a>
            </td>

            {{#each showtimes }}
                <td class="cinema-showtime-td">
                    {{#if booking_link }}
                        <span class="cinema-showtime" show-status='true' url="{{booking_link}}">
                            <a extra="cinemaSC_show_time" class="cqz-url" href="{{booking_link}}" show-status='true'>{{time}}</a>
                        </span>
                    {{else}}
                        <span class="cinema-showtime">{{time}}</span>
                    {{/if}}

                </td>
            {{/each}}
            {{#repeat num_empty_columns}}
                <td class="cinema-showtime-td">
                    <span class="cinema-showtime"> </span>
                </td>
            {{/repeat}}
        </tr>
    {{/each}}
</table>
