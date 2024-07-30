"use client";
import SideBarKBFromConfig from "@/src/app/components/SideBarKBFromConfig";


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
