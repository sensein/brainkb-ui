import { WrenchScrewdriverIcon, LinkIcon } from "@heroicons/react/24/solid";
import yaml from "@/src/app/components/tools-libraries.yaml";
export default function ToolsLibraries() {
    const libraries = yaml.libraries;
    console.log(libraries);


  return (
    <div className="w-full p-8 space-y-12 set-margin-hundred">
      {/* Title */}
      <div className="text-center">
        <h2 className="text-4xl font-bold text-sky-900 mb-6">Tools & Libraries</h2>
      </div>

      {/* Overview */}
      <section className="bg-gray-100 p-8 rounded-lg shadow-md">
        <h3 className="text-3xl font-bold text-sky-900 mb-4 flex items-center">
          <WrenchScrewdriverIcon className="w-8 h-8 text-blue-500 mr-3" />
          Overview
        </h3>
        <p className="text-lg text-gray-700">
          BrainKB provides a set of tools and libraries designed to support and enhance neuroscience research. Developed as part of the BrainKB project, these tools and libraries facilitate operations such as knowledge extraction, structured representation, provenance tracking, and advanced analytics. While these tools are (or will be) integrated into the BrainKB platform to support the BrainKB objective, they are also designed for independent use, offering flexibility.
        </p>
      </section>

      {/* List of Libraries */}
      <section className="bg-gray-100 p-8 rounded-lg shadow-md">
        <h3 className="text-3xl font-bold text-sky-900 mb-4 flex items-center">
          <WrenchScrewdriverIcon className="w-8 h-8 text-blue-500 mr-3" />
          Available Libraries
        </h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-6">
          {libraries.map((lib, index) => (
            <div key={index} className="flex items-start space-x-4 p-5 bg-white rounded-lg shadow">
              <WrenchScrewdriverIcon className="w-8 h-8 text-green-500 flex-shrink-0" />
                <div>
                    <h4 className="text-xl font-semibold text-gray-800">{lib.name}</h4>
                    <p className="text-gray-600">{lib.description}</p>
                    {lib.link_library && (<a
                        href={lib.link_library}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center text-blue-500 hover:underline"
                    >
                        <LinkIcon className="w-5 h-5 mr-1"/> Visit Library
                    </a> )} &nbsp;&nbsp;&nbsp;
                    {lib.link_example && (
                        <a
                        href={lib.link_example}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center text-blue-500 hover:underline"
                    >
                        <LinkIcon className="w-5 h-5 mr-1"/> View Example
                    </a>
                    )}
                </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
