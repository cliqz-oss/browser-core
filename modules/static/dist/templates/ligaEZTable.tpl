<!--<div id="cliqz-results">-->
<div class="cqz-result-h1 ez-liga cqz-result-padding">
  {{#with data}}
    <div class="cqz-ez-title" selectable='' extra="title"><a href="{{../url}}" extra="title">{{extra.leagueName}}</a></div>
    <div class="cqz-result-url overflow" extra="url">{{../urlDetails.friendly_url}}</div>
    <div class="ez-liga-tableHeader">
      <table>
        <thead>
          {{#each extra.info_list}}
            <th>{{this}}</th>
          {{/each}}
        </thead>

        <tbody>
          {{#each extra.ranking}}
            <tr>
              <td>{{rank}}</td>
              <td>{{club}}</td>
              <td>{{SP}}</td>
              <td>{{S}}</td>
              <td>{{U}}</td>
              <td>{{N}}</td>
              <td>{{T}}</td>
              <td>{{GT}}</td>
              <td>{{TD}}</td>
              <td>{{PKT}}</td>
            </tr>
          {{/each}}
        </tbody>
      </table>
    </div>


    <div class="cqz-ez-btn ez-liga-button" url="{{url}}" extra="table-button">{{local 'GoToTable'}}</div>
    <div class="ez-liga-sponsor">{{local 'KickerSponsor'}}</div>


  {{/with}}
  {{>logo}}
</div>

<!--</div>-->
