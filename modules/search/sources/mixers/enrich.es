import cluster from '../operators/cluster';

const enrich = (enricher, target$, source$) =>
  enricher
    .connect(target$, source$)
    .map(cluster);

export default enrich;
