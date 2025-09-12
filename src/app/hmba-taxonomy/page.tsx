"use client";

import React from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';

const HmbaTaxonomy = () => {
  return (
    <div className="kb-page-margin">
      <div className="grid fix-left-margin grid-cols-1">
        <div className="flex items-center justify-center rounded bg-gray-50 h-28 dark:bg-gray-800">
          <div className="text-center">
            <p className="text-2xl text-gray-400 dark:text-gray-500">
              HMBA Taxonomy
            </p>
            <p className="text-gray-400 dark:text-gray-500">
              Placeholder description for HMBA Taxonomy page.
            </p>
          </div>
        </div>
      </div>
      <HighchartsReact
        highcharts={Highcharts}
        options={{
          title: { text: 'Hello NextJS!' },
          series: [{ type: 'line', data: [1, 2, 3, 4, 5] }],
          accessibility: { enabled: true }
        }}
      />
    </div>
  );
};

export default HmbaTaxonomy;
