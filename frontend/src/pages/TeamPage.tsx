import TeamCategory from "@/components/team/TeamCategory";
import type { TeamMember } from "@/types/api";

export function TeamPage() {
  const teamCategories: { title: string; members: TeamMember[] }[] = [
    {
      title: "Current Members",
      members: [
        {
          bio: "Nate Young is the founder and project lead of Autophon. His responsibilities include procuring funding, training and validating the language models, harvesting and enhancing the language dictionaries, managing front- and backend development, and testing and validating the app's functionality. Nate is an Assistant Professor of Swedish as a Second Language at the Department of Swedish at Linnaeus University in Växjö, Sweden. A native of North Carolina, he has a Ph.D. in Linguistics from Queen Mary, University of London (2020), an M.A. in Linguistics from Stockholm University (2015), and a B.S. in Business Administration and B.A. in Slavic Linguistics from the University of North Carolina at Chapel Hill (2004).",
          imaage:
            "https://img.daisyui.com/images/profile/demo/batperson@192.webp",
          name: "Nathan Young",
          role: "Project Lead",
        },
        {
          bio: "Nate Young is the founder and project lead of Autophon. His responsibilities include procuring funding, training and validating the language models, harvesting and enhancing the language dictionaries, managing front- and backend development, and testing and validating the app's functionality. Nate is an Assistant Professor of Swedish as a Second Language at the Department of Swedish at Linnaeus University in Växjö, Sweden. A native of North Carolina, he has a Ph.D. in Linguistics from Queen Mary, University of London (2020), an M.A. in Linguistics from Stockholm University (2015), and a B.S. in Business Administration and B.A. in Slavic Linguistics from the University of North Carolina at Chapel Hill (2004).",
          imaage:
            "https://img.daisyui.com/images/profile/demo/batperson@192.webp",
          name: "Nathan Young",
          role: "Project Lead",
        },
      ],
    },
  ];

  return (
    <>
      <h1 className="text-[3.5rem] leading-[1.1] text-left mb-4 pb-4">
        Autophon Team
      </h1>
      {teamCategories.map((category) => (
        <TeamCategory
          key={category.title}
          title={category.title}
          members={category.members}
        />
      ))}
      {teamCategories.map((category) => (
        <TeamCategory
          key={category.title}
          title={category.title}
          members={category.members}
        />
      ))}
    </>
  );
}
