<!-- Resize to include history -->
<div class="{{ data.genericZone.class }} cqz-ez-holder cqz-ez-generic">
    <div class="cqz-zone-holder">

        {{#each data.genericZone.partials as |partial| }}
            {{!Last argument .. send the correct data to the partial }}
            {{> (lookup ../data.genericZone.partials @index) ..}}
        {{/each}}

        {{> logo }}
    </div>
</div>


