<!-- stocks -->
<div class="cqz-result-h2">

  <div class="meta">
      {{> logo}}
      <h3 class="meta__url no-indent">
        <span>{{ data.message.StockExchange }} : {{ data.message.Symbol }}</span>
        {{#if data.message.min_ago}}
          - <span>{{ local 'agoXMinutes' data.message.min_ago }}</span>
        {{/if}}
        - <span>{{ data.message.time_string }}</span>
      </h3>
  </div>

  <div class="main">
    <div class="main__headline">
      <a href="{{url}}">{{data.message.Name}}</a>
    </div>

  </div>

  <div class="cqz-ez-stock-trend">
    <span>{{ localizeNumbers data.message.LastTradePriceOnly }}</span>
    <span class="{{ data.message.Colour }}">
      <img data-src="https://cdn.cliqz.com/extension/EZ/stocks/EZ-stock-arrow-{{ data.message.Colour }}.svg" class="cqz-ez-img-trend"/>
      {{ localizeNumbers  data.message.Change }} ({{ localizeNumbers data.message.PercentChange }}%)
    </span>
  </div>

  <table class="cliqz-stock-price-table">
    <tr>
      <td> {{local 'cliqz_stock_open'}} </td>
      <td class="cliqz-stock-price-td">{{ localizeNumbers data.message.Open }}</td>
      <td class="cliqz-stock-price-td"> {{local 'cliqz_stock_market_cap'}} </td>
      <td class="cliqz-stock-price-td">{{ localizeNumbers data.message.MarketCapitalization}}</td>
    </tr>
    <tr>
      <td> {{local 'cliqz_stock_high'}} </td>
      <td class="cliqz-stock-price-td">{{ localizeNumbers data.message.DaysHigh }}</td>
      <td class="cliqz-stock-price-td"> {{local 'cliqz_stock_pe_ratio'}}</td>
      <td class="cliqz-stock-price-td">{{ localizeNumbers data.message.PERatio }}</td>
    </tr>
    <tr>
      <td> {{local 'cliqz_stock_low'}} </td>
      <td colspan="3" class="cliqz-stock-price-td">{{ localizeNumbers data.message.DaysLow }}</td>
    </tr>
  </table>

  <div class="cqz-disclaimer cqz-ez-stock-disclaimer">{{ local 'no_legal_disclaimer' }}</div>
</div>

<div class="poweredby">
    Mehr auf <a href="http://finance.yahoo.com">Yahoo finance</a>
</div>
