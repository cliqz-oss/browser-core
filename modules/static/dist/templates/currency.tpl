<div class='cqz-result-h3'>
    <div>
        <div class="EZ-currency EZ-currency-result">
            {{# if data.extra.CurrencyFormatSuport }}
                <span class="cqz-amount">{{ data.extra.toAmount.main }}</span>
            {{else}}
                <span class="cqz-amount">{{ localizeNumbers data.extra.toAmount.main }}</span>
                <span class="cqz-currency-code">{{ data.extra.toCurrency }}</span>
            {{/if}}
        </div>
        <div class="EZ-currency EZ-currency-rate">
            {{localizeNumbers data.extra.multiplyer}} {{data.extra.fromCurrency}} = {{convRateDigitSplit (localizeNumbers data.extra.mConversionRate)}} {{data.extra.toCurrency}}
            <span class="cqz-disclaimer EZ-currency-disclaimer">{{local 'no_legal_disclaimer'}}</span>
        </div>
    </div>
    {{>logo}}
</div>
