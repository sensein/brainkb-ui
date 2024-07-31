"use client";
import SideBarKBFromConfig from "@/src/app/components/SideBarKBFromConfig";
import {useEffect} from "react";
import  enititycardmapperconfig  from '@/src/app/components/enititycardmapper.yaml';
import yaml from 'js-yaml';
const IndividualEntityPage = (
    {
        params,
    }: {
        params: {
            slug: string;
            id: string
        }
    }
) => {
    const loadData = async () => {
            try {
                // Fetch the mapper file
                const page = enititycardmapperconfig.EntityViewCardsMaper.find((page) => page.slug === params.slug);
                const filename = page ? page.filename : "";

                //read entity card design models dynamically
                const data = await import(`@/src/app/components/${filename}`);
                console.log('All YAML Data -- import:', data);
                // console.log('All YAML Data -- import:', data.default.pages.find((page) => page.slug === "default"));

            } catch (error) {
                console.error('Failed to fetch YAML data:', error);
            }
    };

    useEffect(() => {
        loadData();
    }, []);

    return (
        <div className="kb-page-margin">
            <SideBarKBFromConfig/>

            <div className="grid fix-left-margin grid-cols-1 ">
                <div className="flex items-center justify-center rounded bg-gray-50 h-28 dark:bg-gray-800">
                    <div className="text-center">
                        <p className="text-2xl text-gray-400 dark:text-gray-500">
                            {params.slug}
                        </p>
                        <p className="text-gray-400 dark:text-gray-500">
                           {params.id}
                        </p>
                    </div>
                </div>
            </div>



        </div>
    );
};

export default IndividualEntityPage;
