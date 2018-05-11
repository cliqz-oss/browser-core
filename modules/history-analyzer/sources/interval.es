/**
 * This class is intended to abstract the notion of an interval and provide handy
 * functions on intervals like for example, if they overlap, which are the intersections
 * the possible subintervals when intersecting multiple and so on
 */
export default class Interval {
  constructor(start, end, clientData = null) {
    this.start = start;
    this.end = end;
    this.clientData = clientData;
  }

  overlaps(otherInterval) {
    // overlaps if not not overlaps :)
    return !((this.end <= otherInterval.start) || (otherInterval.end <= this.start));
  }

  /**
   * will return all the intervals that results from overlapping intervals
   * This method will return all the non-overlaping possible intervals from all
   * the intersections of the current and otherInterval interval
   * @param  {[type]} otherInterval [description]
   * @return {[type]}       [description]
   */
  splitOverlaps(otherInterval) {
    if (!this.overlaps(otherInterval)) {
      return [];
    }
    const positions = [...new Set([this.start,
      this.end,
      otherInterval.start,
      otherInterval.end])].sort();
    const result = [];
    for (let i = 1; i < positions.length; i += 1) {
      result.push(new Interval(positions[i - 1], positions[i]));
    }
    return result;
  }

  static generateNonOverlapsIntervals(lIntervals) {
    if (lIntervals.length <= 1) {
      return lIntervals;
    }
    const overlapingGroups = [[]];
    // sort the intervals
    lIntervals.sort((a, b) => a.start < b.start);
    for (let i = 0; i < lIntervals.length - 1; i += 1) {
      // check if the next overlaps the current
      const curr = lIntervals[i];
      const next = lIntervals[i + 1];
      const currList = overlapingGroups[overlapingGroups.length - 1];
      currList.push(curr);
      if (!next.overlaps(curr)) {
        // this was the last one, now we create the next list for the incoming
        // overlapping elements
        overlapingGroups.push([]);
      }
    }
    // clean up
    if (overlapingGroups[overlapingGroups.length - 1].length === 0) {
      overlapingGroups[overlapingGroups.length - 1].pop();
    }

    const result = [];
    for (let i = 0; i < overlapingGroups.length; i += 1) {
      const ilist = overlapingGroups[i];
      const pointsSet = new Set();
      for (let k = 0; k < ilist.length; k += 1) {
        pointsSet.add(ilist[k].start);
        pointsSet.add(ilist[k].end);
      }
      const points = [...pointsSet].sort();
      for (let j = 1; j < points.length; j += 1) {
        result.push(new Interval(points[j - 1], points[j]));
      }
    }

    return result;
  }

  /**
   * returns if the current interval is contained in the otherInterval (meaning the otherInterval is
   * bigger than the current one and the current one is inside)
   * @param  {[type]}  otherInterval [description]
   * @return {Boolean}       [description]
   */
  isInside(otherInterval) {
    return otherInterval.start <= this.start && otherInterval.end >= this.end;
  }

  isPointInside(p) {
    return this.start <= p && p <= this.end;
  }

  /**
   * this will return a list of resulting intervals (non overlaping ones) that
   * are the result of cutting the current interval by another one
   */
  cutBy(otherInterval) {
    if (!this.overlaps(otherInterval) || this.isInside(otherInterval)) {
      return [this];
    }
    if (otherInterval.isInside(this)) {
      return this.splitOverlaps(otherInterval);
    }
    // now either start or end are contained in the interval
    let midPoint = otherInterval.end;
    if (this.isPointInside(otherInterval.start)) {
      midPoint = otherInterval.start;
    }
    return [new Interval(this.start, midPoint), new Interval(midPoint, this.end)];
  }

  eql(otherInterval) {
    return this.start === otherInterval.start && this.end === otherInterval.end;
  }
}
